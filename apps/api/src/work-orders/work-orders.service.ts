import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma, WorkOrderStatus, WorkOrderType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly mail: MailService,
  ) {}

  // ---------- 后台 / 调度 ----------

  async list(params: {
    status?: string;
    technicianId?: string;
    customerId?: string;
    date?: string; // YYYY-MM-DD
  }) {
    const where: Prisma.WorkOrderWhereInput = {
      ...(params.status ? { status: params.status as WorkOrderStatus } : {}),
      ...(params.technicianId ? { technicianId: BigInt(params.technicianId) } : {}),
      ...(params.customerId ? { customerId: BigInt(params.customerId) } : {}),
    };
    if (params.date) {
      const start = new Date(`${params.date}T00:00:00`);
      const end = new Date(`${params.date}T23:59:59`);
      where.scheduledAt = { gte: start, lte: end };
    }
    return this.prisma.workOrder.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      include: {
        customer: { select: { email: true, firstName: true, lastName: true } },
        property: { select: { city: true, street: true, zip: true } },
        technician: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });
  }

  /** 调度看板：指定日期，按技师分组（未分配单独一组） */
  async board(date: string) {
    const orders = await this.list({ date });
    const techs = await this.prisma.technician.findMany({
      where: { isActive: true },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    const columns = techs.map((tech) => ({
      technicianId: tech.id.toString(),
      name: `${tech.user.firstName ?? ''} ${tech.user.lastName ?? ''}`.trim() || `Tech ${tech.id}`,
      orders: orders.filter((o) => o.technicianId === tech.id),
    }));
    columns.unshift({
      technicianId: 'unassigned',
      name: '未分配',
      orders: orders.filter((o) => !o.technicianId),
    });
    return columns;
  }

  async get(id: bigint) {
    const wo = await this.prisma.workOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        property: true,
        device: true,
        technician: { include: { user: { select: { firstName: true, lastName: true } } } },
        timeEntries: true,
      },
    });
    if (!wo) throw new NotFoundException('Work order not found');
    return wo;
  }

  async create(data: {
    type: string;
    customerId: bigint;
    propertyId?: bigint;
    deviceId?: bigint;
    appointmentId?: bigint;
    technicianId?: bigint;
    scheduledAt?: Date;
    notes?: string;
  }) {
    const year = new Date().getFullYear();
    const created = await this.prisma.workOrder.create({
      data: {
        number: `tmp-${randomUUID()}`,
        type: data.type as WorkOrderType,
        status: WorkOrderStatus.scheduled,
        customerId: data.customerId,
        propertyId: data.propertyId,
        deviceId: data.deviceId,
        appointmentId: data.appointmentId,
        technicianId: data.technicianId,
        scheduledAt: data.scheduledAt,
        notes: data.notes,
      },
    });
    return this.prisma.workOrder.update({
      where: { id: created.id },
      data: { number: `WO-${year}-${String(created.id).padStart(5, '0')}` },
    });
  }

  assign(id: bigint, technicianId: bigint | null) {
    return this.prisma.workOrder.update({ where: { id }, data: { technicianId } });
  }

  reschedule(id: bigint, scheduledAt: Date) {
    return this.prisma.workOrder.update({ where: { id }, data: { scheduledAt } });
  }

  // ---------- 技师移动端 ----------

  async technicianByUser(userId: bigint) {
    const tech = await this.prisma.technician.findUnique({ where: { userId } });
    if (!tech) throw new NotFoundException('You are not registered as a technician');
    return tech;
  }

  async today(technicianId: bigint) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return this.prisma.workOrder.findMany({
      where: {
        technicianId,
        scheduledAt: { gte: start, lte: end },
        status: { in: ['scheduled', 'in_progress'] },
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        customer: { select: { firstName: true, lastName: true, phone: true } },
        property: true,
      },
    });
  }

  /** 技师打卡：到达 / 开始 / 完成 */
  async clock(id: bigint, technicianId: bigint, event: 'arrived' | 'started' | 'completed') {
    const wo = await this.ownedWo(id, technicianId);
    const entry = await this.prisma.timeEntry.findFirst({
      where: { workOrderId: id, technicianId },
    });
    const field = event === 'arrived' ? 'arrivedAt' : event === 'started' ? 'startedAt' : 'completedAt';
    if (entry) {
      await this.prisma.timeEntry.update({ where: { id: entry.id }, data: { [field]: new Date() } });
    } else {
      await this.prisma.timeEntry.create({
        data: { workOrderId: id, technicianId, [field]: new Date() },
      });
    }
    if (event === 'started' && wo.status === 'scheduled') {
      await this.prisma.workOrder.update({
        where: { id },
        data: { status: WorkOrderStatus.in_progress, startedAt: new Date() },
      });
    }
    return { ok: true, event };
  }

  /** 完工：写现场表单/照片/签名/配件，扣车上库存，生成报告，发邮件 */
  async complete(
    id: bigint,
    technicianId: bigint,
    data: {
      serviceRecord?: Record<string, unknown>;
      photos?: string[];
      signature?: string;
      partsUsed?: Array<{ sku_code: string; quantity: number }>;
      totalCost?: number;
    },
  ) {
    const wo = await this.ownedWo(id, technicianId);
    if (wo.status === 'completed') throw new BadRequestException('Already completed');

    // 扣车上库存（技师对应仓库，按 code 约定 WH-VEHICLE-{techId}，找不到则跳过）
    if (data.partsUsed?.length) {
      const vehicle = await this.prisma.warehouse.findFirst({ where: { type: 'vehicle' } });
      if (vehicle) {
        const skus = await this.prisma.sku.findMany({
          where: { code: { in: data.partsUsed.map((p) => p.sku_code) } },
        });
        const byCode = new Map(skus.map((s) => [s.code, s]));
        for (const p of data.partsUsed) {
          const sku = byCode.get(p.sku_code);
          if (sku) {
            await this.inventory
              .setStock({ skuId: sku.id, warehouseId: vehicle.id, delta: -p.quantity })
              .catch(() => undefined);
          }
        }
      }
    }

    const reportUrl = `/reports/${wo.number}.pdf`; // PDF 生成留待对象存储；先存逻辑 URL
    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: {
        status: WorkOrderStatus.completed,
        completedAt: new Date(),
        serviceRecord: (data.serviceRecord ?? {}) as Prisma.InputJsonValue,
        photos: (data.photos ?? []) as Prisma.InputJsonValue,
        customerSignature: data.signature,
        partsUsed: (data.partsUsed ?? []) as Prisma.InputJsonValue,
        totalCost: data.totalCost !== undefined ? new Prisma.Decimal(data.totalCost) : undefined,
        reportPdfUrl: reportUrl,
      },
    });

    const customer = await this.prisma.customer.findUnique({ where: { id: wo.customerId } });
    if (customer?.email) {
      await this.mail.send({
        to: customer.email,
        subject: `DS SmartLawn · Service completed (${wo.number})`,
        text: `Your service ${wo.number} is complete. A full report is available in your member center.`,
      });
    }
    return updated;
  }

  // ---------- 技师管理 ----------

  listTechnicians() {
    return this.prisma.technician.findMany({
      orderBy: { id: 'asc' },
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
    });
  }

  async createTechnician(userId: bigint, skills?: string[]) {
    const exists = await this.prisma.technician.findUnique({ where: { userId } });
    if (exists) throw new BadRequestException('User is already a technician');
    return this.prisma.technician.create({
      data: { userId, skills: (skills ?? []) as Prisma.InputJsonValue },
    });
  }

  private async ownedWo(id: bigint, technicianId: bigint) {
    const wo = await this.prisma.workOrder.findFirst({ where: { id, technicianId } });
    if (!wo) throw new NotFoundException('Work order not found or not assigned to you');
    return wo;
  }
}
