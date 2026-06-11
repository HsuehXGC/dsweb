import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ChargeRequest,
  ChargeResult,
  PaymentProvider,
  RefundRequest,
  RefundResult,
} from './payment.provider';

/**
 * ProCharge (Electronic Payments) 支付 Provider —— 基于 NMI/TransactionGateway 平台的
 * Direct Post「Payment API」(即邮件中所说的 AIM technology / ProCharge Connect)。
 *
 * 鉴权：security_key（在 ProCharge Gateway → Settings → Security Keys 生成）。
 * 卡号令牌化：前端用 Collect.js 把卡号换成 payment_token（卡号不经我们服务器，PCI SAQ-A），
 *            后端只用 payment_token 调用。
 * 订阅复扣：首期 customer_vault=add_customer → 返回 customer_vault_id 作为永久 profile token。
 *
 * 配置（.env 或 M9 设置）：
 *   PAYMENT_GATEWAY=procharge
 *   PAYMENT_GATEWAY_URL=https://secure.procharge.com/api/transact.php   (测试环境换成对应 URL)
 *   PAYMENT_SECURITY_KEY=<test security key>
 */
@Injectable()
export class ProChargeProvider implements PaymentProvider {
  readonly name = 'procharge';
  private readonly logger = new Logger(ProChargeProvider.name);

  constructor(private readonly config: ConfigService) {}

  private endpoint(): string {
    return (
      this.config.get<string>('PAYMENT_GATEWAY_URL') ?? 'https://secure.procharge.com/api/transact.php'
    );
  }

  private securityKey(): string {
    const key = this.config.get<string>('PAYMENT_SECURITY_KEY') ?? this.config.get<string>('PAYMENT_TRANSACTION_KEY');
    if (!key) throw new Error('ProCharge: PAYMENT_SECURITY_KEY 未配置');
    return key;
  }

  /** 发起 Direct Post 请求，返回解析后的响应字段 */
  private async post(params: Record<string, string>): Promise<Record<string, string>> {
    const body = new URLSearchParams({ security_key: this.securityKey(), ...params });
    const res = await fetch(this.endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const text = await res.text();
    // 响应为 URL-encoded 查询串：response=1&responsetext=...&transactionid=...
    const out: Record<string, string> = {};
    new URLSearchParams(text).forEach((v, k) => (out[k] = v));
    return out;
  }

  async charge(req: ChargeRequest): Promise<ChargeResult> {
    try {
      const params: Record<string, string> = {
        type: 'sale',
        amount: req.amount.toFixed(2),
        currency: req.currency || 'USD',
        payment_token: req.token, // 来自 Collect.js
        orderid: req.idempotencyKey,
      };
      if (req.saveProfile) params.customer_vault = 'add_customer';

      const r = await this.post(params);
      const approved = r.response === '1';
      if (!approved) {
        return { success: false, transactionId: '', declineReason: r.responsetext || 'Declined' };
      }
      return {
        success: true,
        transactionId: r.transactionid,
        profileToken: req.saveProfile ? r.customer_vault_id : undefined,
      };
    } catch (e) {
      this.logger.error(`ProCharge charge failed: ${(e as Error).message}`);
      return { success: false, transactionId: '', declineReason: 'Gateway error' };
    }
  }

  async chargeProfile(profileToken: string, amount: number, idempotencyKey: string): Promise<ChargeResult> {
    try {
      const r = await this.post({
        type: 'sale',
        amount: amount.toFixed(2),
        customer_vault_id: profileToken,
        orderid: idempotencyKey,
      });
      const approved = r.response === '1';
      return approved
        ? { success: true, transactionId: r.transactionid }
        : { success: false, transactionId: '', declineReason: r.responsetext || 'Declined' };
    } catch (e) {
      this.logger.error(`ProCharge recurring charge failed: ${(e as Error).message}`);
      return { success: false, transactionId: '', declineReason: 'Gateway error' };
    }
  }

  async refund(req: RefundRequest): Promise<RefundResult> {
    try {
      const r = await this.post({
        type: 'refund',
        transactionid: req.transactionId,
        amount: req.amount.toFixed(2),
      });
      const ok = r.response === '1';
      return { success: ok, refundId: ok ? r.transactionid : '' };
    } catch (e) {
      this.logger.error(`ProCharge refund failed: ${(e as Error).message}`);
      return { success: false, refundId: '' };
    }
  }
}
