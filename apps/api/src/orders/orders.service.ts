import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { OrderType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';

export interface OrderLineInput {
  skuId: bigint;
  quantity: number;
  unitPrice: number;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
  ) {}

  // ---------- 后台 ----------

  async list(params: { page?: number; pageSize?: number; status?: string }) {
    const take = Math.min(params.pageSize ?? 20, 100);
    const skip = (Math.max(params.page ?? 1, 1) - 1) * take;
    const where: Prisma.OrderWhereInput = {
      deletedAt: null,
      ...(params.status ? { status: params.status } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { placedAt: 'desc' },
        take,
        skip,
        include: { customer: { select: { email: true, firstName: true, lastName: true } } },
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      data: rows,
      meta: { total, current_page: params.page ?? 1, page_size: take, total_pages: Math.ceil(total / take) },
    };
  }

  async get(id: bigint) {
    const order = await this.prisma.order.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: { select: { uuid: true, email: true, firstName: true, lastName: true } },
        items: { include: { sku: { include: { product: { select: { name: true } } } } } },
        payments: true,
        invoices: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(id: bigint, status: string) {
    const o = await this.prisma.order.findFirst({ where: { id, deletedAt: null } });
    if (!o) throw new NotFoundException('Order not found');
    return this.prisma.order.update({ where: { id }, data: { status } });
  }

  // ---------- 供结账(C3)/订阅(C4)调用 ----------

  /** 创建待支付订单（含明细 + 计算后的金额），不扣库存。 */
  async createPending(input: {
    customerId: bigint;
    type?: OrderType;
    lines: OrderLineInput[];
    subtotal: number;
    tax: number;
    shipping: number;
    discount: number;
    total: number;
    billingAddress?: Record<string, unknown>;
    shippingAddress?: Record<string, unknown>;
    subscriptionId?: bigint;
  }) {
    const year = new Date().getFullYear();
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          number: `tmp-${randomUUID()}`,
          customerId: input.customerId,
          type: input.type ?? OrderType.one_time,
          status: 'pending',
          paymentStatus: 'pending',
          subtotal: new Prisma.Decimal(input.subtotal),
          tax: new Prisma.Decimal(input.tax),
          shipping: new Prisma.Decimal(input.shipping),
          discount: new Prisma.Decimal(input.discount),
          total: new Prisma.Decimal(input.total),
          billingAddress: (input.billingAddress ?? {}) as Prisma.InputJsonValue,
          shippingAddress: (input.shippingAddress ?? {}) as Prisma.InputJsonValue,
          subscriptionId: input.subscriptionId,
          items: {
            create: input.lines.map((l) => ({
              skuId: l.skuId,
              quantity: l.quantity,
              unitPrice: new Prisma.Decimal(l.unitPrice),
              total: new Prisma.Decimal(l.unitPrice * l.quantity),
            })),
          },
        },
        include: { items: true },
      });
      const number = `ORD-${year}-${String(order.id).padStart(5, '0')}`;
      return tx.order.update({ where: { id: order.id }, data: { number }, include: { items: true } });
    });
  }

  /** 标记已支付：状态→paid、记 paidAt、扣减主仓库存、自动开票。 */
  async markPaid(orderId: bigint) {
    const warehouse = await this.inventory.mainWarehouse();
    const year = new Date().getFullYear();
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== 'paid') {
        await this.inventory.deductForItems(
          tx,
          order.items.map((i) => ({ skuId: i.skuId, quantity: i.quantity })),
          warehouse.id,
        );
      }
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: 'paid', paymentStatus: 'paid', paidAt: new Date() },
      });
      // 自动开票（幂等：该订单尚无发票时才建）
      const hasInvoice = await tx.invoice.findFirst({ where: { orderId } });
      if (!hasInvoice) {
        const inv = await tx.invoice.create({
          data: {
            number: `tmp-inv-${orderId}`,
            orderId,
            status: 'paid',
            total: order.total,
            issuedAt: new Date(),
          },
        });
        await tx.invoice.update({
          where: { id: inv.id },
          data: { number: `INV-${year}-${String(inv.id).padStart(5, '0')}` },
        });
      }
      return updated;
    });
  }
}
