import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService, type OrderLineInput } from '../orders/orders.service';
import { PaymentService } from '../payment/payment.service';
import { MailService } from '../mail/mail.service';

interface CheckoutItem {
  sku_code: string;
  quantity: number;
}

interface CheckoutInput {
  items: CheckoutItem[];
  customer: { email: string; first_name?: string; last_name?: string; phone?: string };
  shipping_address?: Record<string, unknown>;
  billing_address?: Record<string, unknown>;
  payment_token: string;
  discount_code?: string;
  locale?: 'en' | 'zh';
}

@Injectable()
export class CommerceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly payment: PaymentService,
    private readonly mail: MailService,
  ) {}

  /** 询价：根据 items + discount 计算金额（前端结账页展示用，不下单） */
  async quote(items: CheckoutItem[], discountCode?: string) {
    const { lines, subtotal } = await this.resolveLines(items);
    const tax = await this.calcTax(subtotal);
    const shipping = await this.calcShipping(subtotal);
    const discount = await this.calcDiscount(subtotal, discountCode);
    const total = Math.max(0, round2(subtotal + tax + shipping - discount));
    return {
      lines: lines.map((l) => ({ sku_code: l.code, quantity: l.quantity, unit_price: l.unitPrice, total: round2(l.unitPrice * l.quantity) })),
      subtotal: round2(subtotal),
      tax: round2(tax),
      shipping: round2(shipping),
      discount: round2(discount),
      total,
    };
  }

  /** 结账：建单→扣款→扣库存→邮件。返回订单结果。 */
  async checkout(input: CheckoutInput) {
    if (!input.items?.length) throw new BadRequestException('Cart is empty');
    const { lines, subtotal } = await this.resolveLines(input.items);
    const tax = await this.calcTax(subtotal);
    const shipping = await this.calcShipping(subtotal);
    const discount = await this.calcDiscount(subtotal, input.discount_code);
    const total = Math.max(0, round2(subtotal + tax + shipping - discount));

    // 客户：按 email 找或建
    const customer =
      (await this.prisma.customer.findUnique({ where: { email: input.customer.email } })) ??
      (await this.prisma.customer.create({
        data: {
          email: input.customer.email,
          firstName: input.customer.first_name,
          lastName: input.customer.last_name,
          phone: input.customer.phone,
          source: 'web',
        },
      }));

    const orderLines: OrderLineInput[] = lines.map((l) => ({
      skuId: l.skuId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
    }));

    const order = await this.orders.createPending({
      customerId: customer.id,
      lines: orderLines,
      subtotal: round2(subtotal),
      tax: round2(tax),
      shipping: round2(shipping),
      discount: round2(discount),
      total,
      billingAddress: input.billing_address,
      shippingAddress: input.shipping_address,
    });

    // 扣款
    const charge = await this.payment.chargeOrder({
      orderId: order.id,
      amount: total,
      token: input.payment_token,
      idempotencyKey: `checkout_${order.number}_${randomUUID()}`,
    });

    if (!charge.success) {
      await this.orders.updateStatus(order.id, 'payment_failed');
      throw new BadRequestException(charge.declineReason ?? 'Payment failed');
    }

    // 扣库存 + 标记已付
    await this.orders.markPaid(order.id);

    // 折扣码使用计数
    if (input.discount_code && discount > 0) {
      await this.prisma.discountCode
        .updateMany({ where: { code: input.discount_code }, data: { usedCount: { increment: 1 } } })
        .catch(() => undefined);
    }

    // 确认邮件
    const locale = input.locale ?? 'en';
    await this.mail.send({
      to: customer.email,
      subject:
        locale === 'zh'
          ? `DS SmartLawn · 订单确认 ${order.number}`
          : `DS SmartLawn · Order confirmation ${order.number}`,
      text:
        locale === 'zh'
          ? `感谢下单！\n订单号：${order.number}\n合计：$${total.toFixed(2)}\n我们会尽快备货发货。`
          : `Thank you for your order!\nOrder: ${order.number}\nTotal: $${total.toFixed(2)}\nWe’ll prepare your shipment shortly.`,
    });

    return {
      order_uuid: order.uuid,
      order_number: order.number,
      total,
      status: 'paid',
    };
  }

  // ---------- 内部计算 ----------

  private async resolveLines(items: CheckoutItem[]) {
    const codes = items.map((i) => i.sku_code);
    const skus = await this.prisma.sku.findMany({
      where: { code: { in: codes } },
      include: { product: true },
    });
    const byCode = new Map(skus.map((s) => [s.code, s]));
    let subtotal = 0;
    const lines = items.map((i) => {
      const sku = byCode.get(i.sku_code);
      if (!sku) throw new BadRequestException(`Unknown SKU: ${i.sku_code}`);
      const qty = Math.max(1, Math.floor(i.quantity));
      const unitPrice = Number(sku.price ?? sku.product.basePrice);
      subtotal += unitPrice * qty;
      return { skuId: sku.id, code: sku.code, quantity: qty, unitPrice };
    });
    return { lines, subtotal };
  }

  private async setting(key: string): Promise<number> {
    const row = await this.prisma.setting.findUnique({ where: { key } });
    if (!row) return 0;
    const v = row.value as unknown;
    return typeof v === 'number' ? v : Number(v) || 0;
  }

  private async calcTax(subtotal: number) {
    const rate = await this.setting('tax.ma_rate');
    return (subtotal * rate) / 100;
  }

  private async calcShipping(subtotal: number) {
    const flat = await this.setting('shipping.flat_rate');
    const threshold = await this.setting('shipping.free_threshold');
    if (threshold > 0 && subtotal >= threshold) return 0;
    return flat;
  }

  private async calcDiscount(subtotal: number, code?: string) {
    if (!code) return 0;
    const dc = await this.prisma.discountCode.findUnique({ where: { code } });
    if (!dc || !dc.isActive) return 0;
    const now = new Date();
    if (dc.startsAt && dc.startsAt > now) return 0;
    if (dc.expiresAt && dc.expiresAt < now) return 0;
    if (dc.minAmount && subtotal < Number(dc.minAmount)) return 0;
    if (dc.maxUses && dc.usedCount >= dc.maxUses) return 0;
    return dc.type === 'percent' ? (subtotal * Number(dc.value)) / 100 : Number(dc.value);
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
