import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from '../payment/payment.service';
import { OrdersService } from '../orders/orders.service';
import { MailService } from '../mail/mail.service';

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_PAUSE_DAYS = 90;

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payment: PaymentService,
    private readonly orders: OrdersService,
    private readonly mail: MailService,
  ) {}

  /** 客户订阅：首期扣款(保存 profile token)→建订阅+首期订单。 */
  async subscribe(customerId: bigint, productSlug: string, paymentToken: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug: productSlug, type: 'subscription', isActive: true },
      include: { skus: true },
    });
    if (!product) throw new BadRequestException('Subscription product not found');

    const active = await this.prisma.subscription.findFirst({
      where: { customerId, status: { in: ['active', 'past_due'] } },
    });
    if (active) throw new BadRequestException('Already subscribed');

    const planPrice = Number(product.basePrice);

    // 首期订单(待支付)。订阅为服务类，订单不含实物明细、不扣库存。
    const order = await this.orders.createPending({
      customerId,
      type: 'subscription',
      lines: [],
      subtotal: planPrice,
      tax: 0,
      shipping: 0,
      discount: 0,
      total: planPrice,
    });

    const charge = await this.payment.chargeOrder({
      orderId: order.id,
      amount: planPrice,
      token: paymentToken,
      idempotencyKey: `sub_first_${order.number}_${randomUUID()}`,
      saveProfile: true,
    });
    if (!charge.success) {
      await this.orders.updateStatus(order.id, 'payment_failed');
      throw new BadRequestException(charge.declineReason ?? 'Payment failed');
    }
    await this.orders.markPaid(order.id);

    const now = Date.now();
    const subscription = await this.prisma.subscription.create({
      data: {
        customerId,
        status: SubscriptionStatus.active,
        planPrice: new Prisma.Decimal(planPrice),
        interval: 'month',
        gatewayProfileToken: charge.profileToken,
        currentPeriodEnd: new Date(now + MONTH_MS),
        nextBillingAt: new Date(now + MONTH_MS),
      },
    });
    await this.prisma.order.update({ where: { id: order.id }, data: { subscriptionId: subscription.id } });
    return subscription;
  }

  async pause(customerId: bigint, uuid: string, days: number) {
    const sub = await this.ownedSub(customerId, uuid);
    if (sub.status !== 'active') throw new BadRequestException('Only active subscriptions can be paused');
    const clamped = Math.min(Math.max(days, 1), MAX_PAUSE_DAYS);
    return this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: SubscriptionStatus.paused,
        pausedUntil: new Date(Date.now() + clamped * 24 * 60 * 60 * 1000),
      },
    });
  }

  async resume(customerId: bigint, uuid: string) {
    const sub = await this.ownedSub(customerId, uuid);
    if (sub.status !== 'paused') throw new BadRequestException('Only paused subscriptions can be resumed');
    return this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: SubscriptionStatus.active, pausedUntil: null },
    });
  }

  async cancel(customerId: bigint, uuid: string, immediate: boolean) {
    const sub = await this.ownedSub(customerId, uuid);
    return this.prisma.subscription.update({
      where: { id: sub.id },
      data: immediate
        ? { status: SubscriptionStatus.cancelled, cancelledAt: new Date(), nextBillingAt: null }
        : { cancelledAt: new Date() }, // 周期末取消：保留 active 至 currentPeriodEnd，扣款时不再续
    });
  }

  /** 周期扣款：处理到期订阅。失败按 3/5/7 天重试逻辑简化为标记 past_due。 */
  async runDueBilling() {
    const now = new Date();
    const due = await this.prisma.subscription.findMany({
      where: { status: 'active', nextBillingAt: { lte: now }, gatewayProfileToken: { not: null } },
    });
    const results: Array<{ uuid: string; outcome: string }> = [];
    for (const sub of due) {
      // 已标记周期末取消 → 到期不再续，置 cancelled
      if (sub.cancelledAt) {
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { status: SubscriptionStatus.cancelled, nextBillingAt: null },
        });
        results.push({ uuid: sub.uuid, outcome: 'cancelled_at_period_end' });
        continue;
      }
      const amount = Number(sub.planPrice);
      const charge = await this.payment.chargeProfile(
        sub.gatewayProfileToken!,
        amount,
        `sub_recur_${sub.uuid}_${now.getTime()}`,
      );
      if (charge.success) {
        const order = await this.orders.createPending({
          customerId: sub.customerId,
          type: 'subscription',
          lines: [],
          subtotal: amount,
          tax: 0,
          shipping: 0,
          discount: 0,
          total: amount,
          subscriptionId: sub.id,
        });
        await this.prisma.order.update({
          where: { id: order.id },
          data: { status: 'paid', paymentStatus: 'paid', paidAt: now },
        });
        await this.prisma.payment.create({
          data: {
            orderId: order.id,
            amount: new Prisma.Decimal(amount),
            status: 'succeeded',
            gatewayTxnId: charge.transactionId,
            idempotencyKey: `sub_recur_pay_${sub.uuid}_${now.getTime()}`,
          },
        });
        const next = new Date(now.getTime() + MONTH_MS);
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { nextBillingAt: next, currentPeriodEnd: next },
        });
        results.push({ uuid: sub.uuid, outcome: 'charged' });
      } else {
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { status: SubscriptionStatus.past_due },
        });
        results.push({ uuid: sub.uuid, outcome: 'past_due' });
      }
    }
    return { processed: due.length, results };
  }

  listAdmin() {
    return this.prisma.subscription.findMany({
      orderBy: { createdAt: 'desc' },
      include: { customer: { select: { email: true } } },
    });
  }

  private async ownedSub(customerId: bigint, uuid: string) {
    const sub = await this.prisma.subscription.findFirst({ where: { uuid, customerId } });
    if (!sub) throw new NotFoundException('Subscription not found');
    return sub;
  }
}
