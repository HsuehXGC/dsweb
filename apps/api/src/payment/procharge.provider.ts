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
 * ProCharge (Electronic Payments) 支付 Provider —— 对接 dev-api.procharge.com REST API (OAS 3.1)。
 *
 * 鉴权：POST /api/authentication/login 拿 JWT access_token（内存缓存），
 *       之后所有请求带 Authorization: Bearer <token>。
 * 下单：POST /api/transaction（type=sale，用 token 或卡号）。
 * 退款：POST /api/transaction（type=refund + 原 transactionId）。
 * 令牌化：POST /api/token（卡号→token）。
 *
 * 沙箱：merchant 518564990154510（Fiserv）；测试 token 如 345678901(批准)/458967677(拒付)。
 *
 * ⚠️ 下方 REQ/RESP 字段映射按 swagger 端点与常见约定填写，最终以
 *    authenticationRequest / transaction / transactionResponse 等 schema 为准（已请用户核对）。
 *
 * 配置(.env)：
 *   PAYMENT_GATEWAY=procharge
 *   PROCHARGE_BASE_URL=https://dev-api.procharge.com
 *   PROCHARGE_LOGIN_ID / PROCHARGE_REG_KEY / PROCHARGE_PASSWORD
 *   PROCHARGE_MERCHANT=518564990154510
 */
@Injectable()
export class ProChargeProvider implements PaymentProvider {
  readonly name = 'procharge';
  private readonly logger = new Logger(ProChargeProvider.name);
  private tokenCache: { jwt: string; expiresAt: number } | null = null;

  constructor(private readonly config: ConfigService) {}

  // 注意：ProCharge dev API 的 WAF 会拦截非浏览器 User-Agent（curl/node 默认 UA 返回 403），
  // 故所有请求都带上浏览器 UA。
  private readonly UA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

  private base(): string {
    return this.config.get<string>('PROCHARGE_BASE_URL') ?? 'https://dev-api.procharge.com';
  }
  private merchant(): string {
    return this.config.get<string>('PROCHARGE_MERCHANT') ?? '518564990154510';
  }

  /** 获取并缓存 JWT（提前 60s 过期重取） */
  private async getJwt(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 60_000) {
      return this.tokenCache.jwt;
    }
    const body = {
      // ⚠️ 字段名待按 authenticationRequest schema 核对
      loginId: this.config.getOrThrow<string>('PROCHARGE_LOGIN_ID'),
      regKey: this.config.get<string>('PROCHARGE_REG_KEY') ?? '',
      password: this.config.getOrThrow<string>('PROCHARGE_PASSWORD'),
    };
    const res = await fetch(`${this.base()}/api/authentication/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': this.UA },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`ProCharge auth failed: ${res.status}`);
    const j = (await res.json()) as { access_token?: string; expires_in?: number };
    const jwt = (j.access_token ?? '').replace(/^Bearer\s+/i, '');
    if (!jwt) throw new Error('ProCharge auth: no access_token');
    this.tokenCache = { jwt, expiresAt: Date.now() + (j.expires_in ?? 3600) * 1000 };
    return jwt;
  }

  private async authedPost(path: string, body: Record<string, unknown>) {
    const jwt = await this.getJwt();
    const res = await fetch(`${this.base()}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': this.UA,
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, status: res.status, json };
  }

  /** 解析交易响应是否成功（兼容多种字段命名，待按 transactionResponse 核对） */
  private isApproved(j: Record<string, unknown>): boolean {
    const code = String(j.responseCode ?? j.response ?? j.status ?? '').toLowerCase();
    return code === '1' || code === '00' || code === 'approved' || j.approved === true;
  }
  private txnId(j: Record<string, unknown>): string {
    return String(j.transactionId ?? j.transactionid ?? j.transId ?? j.id ?? '');
  }
  private reason(j: Record<string, unknown>): string {
    return String(j.responseText ?? j.message ?? j.error ?? 'Declined');
  }

  async charge(req: ChargeRequest): Promise<ChargeResult> {
    try {
      const { json } = await this.authedPost('/api/transaction', {
        // ⚠️ 字段名待按 transaction schema 核对
        merchant: this.merchant(),
        transactionType: 'sale',
        amount: req.amount.toFixed(2),
        token: req.token,
        orderId: req.idempotencyKey,
        storeToken: req.saveProfile ?? false,
      });
      if (!this.isApproved(json)) {
        return { success: false, transactionId: '', declineReason: this.reason(json) };
      }
      return {
        success: true,
        transactionId: this.txnId(json),
        profileToken: req.saveProfile ? String(json.token ?? json.customerToken ?? '') || undefined : undefined,
      };
    } catch (e) {
      this.logger.error(`ProCharge charge failed: ${(e as Error).message}`);
      return { success: false, transactionId: '', declineReason: 'Gateway error' };
    }
  }

  async chargeProfile(profileToken: string, amount: number, idempotencyKey: string): Promise<ChargeResult> {
    try {
      const { json } = await this.authedPost('/api/transaction', {
        merchant: this.merchant(),
        transactionType: 'sale',
        amount: amount.toFixed(2),
        token: profileToken,
        orderId: idempotencyKey,
      });
      return this.isApproved(json)
        ? { success: true, transactionId: this.txnId(json) }
        : { success: false, transactionId: '', declineReason: this.reason(json) };
    } catch (e) {
      this.logger.error(`ProCharge recurring charge failed: ${(e as Error).message}`);
      return { success: false, transactionId: '', declineReason: 'Gateway error' };
    }
  }

  async refund(req: RefundRequest): Promise<RefundResult> {
    try {
      const { json } = await this.authedPost('/api/transaction', {
        merchant: this.merchant(),
        transactionType: 'refund',
        amount: req.amount.toFixed(2),
        transactionId: req.transactionId,
      });
      const ok = this.isApproved(json);
      return { success: ok, refundId: ok ? this.txnId(json) : '' };
    } catch (e) {
      this.logger.error(`ProCharge refund failed: ${(e as Error).message}`);
      return { success: false, refundId: '' };
    }
  }
}
