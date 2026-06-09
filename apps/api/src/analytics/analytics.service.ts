import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 仪表板首页关键指标 —— 对应需求文档 M8 */
  async dashboard() {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      todayOrders,
      todayWorkOrders,
      pendingWorkOrders,
      monthRevenue,
      monthNewCustomers,
      activeSubs,
      openTickets,
    ] = await Promise.all([
      this.prisma.order.count({ where: { placedAt: { gte: startOfDay }, deletedAt: null } }),
      this.prisma.workOrder.count({ where: { scheduledAt: { gte: startOfDay } } }),
      this.prisma.workOrder.count({ where: { status: { in: ['scheduled', 'in_progress'] } } }),
      this.prisma.order.aggregate({
        _sum: { total: true },
        where: { status: 'paid', paidAt: { gte: startOfMonth }, deletedAt: null },
      }),
      this.prisma.customer.count({ where: { createdAt: { gte: startOfMonth }, deletedAt: null } }),
      this.prisma.subscription.findMany({ where: { status: 'active' }, select: { planPrice: true } }),
      this.prisma.supportTicket.count({ where: { status: { in: ['open', 'pending'] } } }),
    ]);

    const mrr = activeSubs.reduce((sum, s) => sum + Number(s.planPrice), 0);

    return {
      today_orders: todayOrders,
      today_work_orders: todayWorkOrders,
      pending_work_orders: pendingWorkOrders,
      month_revenue: Number(monthRevenue._sum.total ?? 0),
      month_new_customers: monthNewCustomers,
      active_subscriptions: activeSubs.length,
      mrr,
      arr: mrr * 12,
      open_tickets: openTickets,
    };
  }

  /** 转化漏斗：线索 → 预约 → 工单 → 成交订单 */
  async conversionFunnel() {
    const [leads, appointments, workOrders, paidOrders] = await Promise.all([
      this.prisma.lead.count(),
      this.prisma.appointment.count(),
      this.prisma.workOrder.count(),
      this.prisma.order.count({ where: { status: 'paid', deletedAt: null } }),
    ]);
    return {
      stages: [
        { stage: 'leads', label: '线索', count: leads },
        { stage: 'appointments', label: '预约', count: appointments },
        { stage: 'work_orders', label: '工单', count: workOrders },
        { stage: 'paid_orders', label: '成交', count: paidOrders },
      ],
    };
  }

  /** 销售报表：按产品统计已付订单营收（近 N 单聚合） */
  async salesByProduct() {
    const items = await this.prisma.orderItem.findMany({
      where: { order: { status: 'paid', deletedAt: null } },
      include: { sku: { include: { product: { select: { name: true } } } } },
    });
    const byProduct = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const it of items) {
      const name = it.sku.product.name;
      const cur = byProduct.get(name) ?? { name, qty: 0, revenue: 0 };
      cur.qty += it.quantity;
      cur.revenue += Number(it.total);
      byProduct.set(name, cur);
    }
    return Array.from(byProduct.values()).sort((a, b) => b.revenue - a.revenue);
  }

  /** 订阅报表：MRR/ARR/活跃/各状态分布 */
  async subscriptionReport() {
    const subs = await this.prisma.subscription.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const active = await this.prisma.subscription.findMany({
      where: { status: 'active' },
      select: { planPrice: true },
    });
    const mrr = active.reduce((s, x) => s + Number(x.planPrice), 0);
    return {
      mrr,
      arr: mrr * 12,
      by_status: subs.map((s) => ({ status: s.status, count: s._count._all })),
    };
  }
}
