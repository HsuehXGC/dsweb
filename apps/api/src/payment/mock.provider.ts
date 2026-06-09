import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type {
  ChargeRequest,
  ChargeResult,
  PaymentProvider,
  RefundRequest,
  RefundResult,
} from './payment.provider';

/**
 * Mock 支付网关（开发/演示用）。
 * 约定：token 含 "decline" → 模拟拒付；否则成功。
 * 真实网关接入后用同接口的 Provider 替换，业务层无需改动。
 */
@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  async charge(req: ChargeRequest): Promise<ChargeResult> {
    if (req.token.includes('decline')) {
      return { success: false, transactionId: '', declineReason: 'Card declined (mock)' };
    }
    return {
      success: true,
      transactionId: `mock_txn_${randomUUID()}`,
      profileToken: req.saveProfile ? `mock_profile_${createHash('sha256').update(req.token).digest('hex').slice(0, 24)}` : undefined,
    };
  }

  async chargeProfile(profileToken: string, _amount: number, _idempotencyKey: string): Promise<ChargeResult> {
    if (!profileToken.startsWith('mock_profile_')) {
      return { success: false, transactionId: '', declineReason: 'Invalid profile token (mock)' };
    }
    return { success: true, transactionId: `mock_txn_${randomUUID()}` };
  }

  async refund(req: RefundRequest): Promise<RefundResult> {
    return { success: true, refundId: `mock_refund_${randomUUID()}_${req.transactionId.slice(-6)}` };
  }
}
