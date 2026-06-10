import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { page?: number; pageSize?: number; q?: string }) {
    const take = Math.min(params.pageSize ?? 20, 100);
    const skip = (Math.max(params.page ?? 1, 1) - 1) * take;
    const where: Prisma.CustomerWhereInput = {
      deletedAt: null,
      ...(params.q
        ? {
            OR: [
              { email: { contains: params.q, mode: 'insensitive' } },
              { firstName: { contains: params.q, mode: 'insensitive' } },
              { lastName: { contains: params.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.customer.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip }),
      this.prisma.customer.count({ where }),
    ]);
    return {
      data: rows,
      meta: {
        total,
        current_page: params.page ?? 1,
        page_size: take,
        total_pages: Math.ceil(total / take),
      },
    };
  }

  /** 客户 360° 视图：基本信息 + 地块 + 设备 + 订单 + 商机 + 活动 */
  async get360(id: bigint) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        properties: { orderBy: { createdAt: 'desc' } },
        devices: { orderBy: { createdAt: 'desc' } },
        orders: { orderBy: { placedAt: 'desc' }, take: 20 },
        deals: { orderBy: { createdAt: 'desc' } },
        activities: { orderBy: { occurredAt: 'desc' }, take: 50 },
        workOrders: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async create(data: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    locale?: string;
  }) {
    const exists = await this.prisma.customer.findUnique({ where: { email: data.email } });
    if (exists) throw new BadRequestException('Email already exists');
    return this.prisma.customer.create({ data });
  }

  async update(
    id: bigint,
    data: { firstName?: string; lastName?: string; phone?: string; vipLevel?: number },
  ) {
    const c = await this.prisma.customer.findFirst({ where: { id, deletedAt: null } });
    if (!c) throw new NotFoundException('Customer not found');
    return this.prisma.customer.update({ where: { id }, data });
  }

  // ---- 设备（已购机器人：序列号 + 保修） ----
  addDevice(
    customerId: bigint,
    data: { model: string; serialNumber: string; installedAt?: Date; warrantyMonths?: number },
  ) {
    const installed = data.installedAt ?? new Date();
    const warrantyEnd = data.warrantyMonths
      ? new Date(installed.getTime() + data.warrantyMonths * 30 * 24 * 60 * 60 * 1000)
      : new Date(installed.getTime() + 24 * 30 * 24 * 60 * 60 * 1000); // 默认 24 个月
    return this.prisma.device.create({
      data: {
        customerId,
        model: data.model,
        serialNumber: data.serialNumber,
        installedAt: installed,
        warrantyEnd,
      },
    });
  }

  // ---- 地块 ----
  addProperty(
    customerId: bigint,
    data: {
      label?: string;
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
      acres?: number;
      slope?: string;
      notes?: string;
    },
  ) {
    return this.prisma.property.create({
      data: {
        customerId,
        ...data,
        acres: data.acres !== undefined ? new Prisma.Decimal(data.acres) : undefined,
      },
    });
  }
}
