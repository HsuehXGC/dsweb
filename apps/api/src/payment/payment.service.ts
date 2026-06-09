import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MockPaymentProvider } from './mock.provider';
import type { PaymentProvider } from './payment.provider';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mock: MockPaymentProvider,
  ) {}

  /** 选择支付 provider。当前仅 mock；真实网关接入后在此分支。 */
  private provider(): PaymentProvider {
    const gateway = this.config.get<string>('PAYMENT_GATEWAY') ?? 'mock';
    switch (gateway) {
      // case 'authorize_net': return this.authorizeNet;
      default:
        return this.mock;
    }
  }

  /** 为订单扣款并记录 payments 流水。幂等键防重复扣款。 */
  async chargeOrder(params: {
    orderId: bigint;
    amount: number;
    token: string;
    idempotencyKey: string;
    saveProfile?: boolean;
  }) {
    // 幂等：同 key 已成功则直接返回
    const existing = await this.prisma.payment.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });
    if (existing) {
      return { success: existing.status === 'succeeded', payment: existing, profileToken: undefined };
    }

    const result = await this.provider().charge({
      amount: params.amount,
      currency: 'USD',
      token: params.token,
      idempotencyKey: params.idempotencyKey,
      saveProfile: params.saveProfile,
    });

    const payment = await this.prisma.payment.create({
      data: {
        orderId: params.orderId,
        amount: new Prisma.Decimal(params.amount),
        currency: 'USD',
        status: result.success ? 'succeeded' : 'failed',
        gatewayTxnId: result.transactionId || null,
        idempotencyKey: params.idempotencyKey,
      },
    });

    return { success: result.success, payment, profileToken: result.profileToken, declineReason: result.declineReason };
  }

  /** 订阅复扣（用保存的 profile token） */
  chargeProfile(profileToken: string, amount: number, idempotencyKey: string) {
    return this.provider().chargeProfile(profileToken, amount, idempotencyKey);
  }

  /** 退款：调网关并记录 refunds 流水 */
  async refundPayment(paymentId: bigint, amount: number, approvedById?: bigint) {
    const payment = await this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    const result = await this.provider().refund({
      transactionId: payment.gatewayTxnId ?? '',
      amount,
    });
    const refund = await this.prisma.refund.create({
      data: {
        paymentId,
        amount: new Prisma.Decimal(amount),
        status: result.success ? 'processed' : 'rejected',
        gatewayTxnId: result.refundId,
        approvedById,
      },
    });
    if (result.success) {
      await this.prisma.payment.update({ where: { id: paymentId }, data: { status: 'refunded' } });
    }
    return { success: result.success, refund };
  }
}
