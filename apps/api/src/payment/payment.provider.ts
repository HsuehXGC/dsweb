/**
 * 支付网关抽象 —— 对应需求文档第七章。
 * 真实银行网关(Authorize.Net 等)需 KYC，先用 Mock 让结账/订阅闭环跑通，
 * 之后实现同一接口的 Provider 即可无缝替换。
 *
 * Tokenization：卡号永不进我们服务器，前端用网关 SDK 换 token，后端只用 token 扣款。
 */

export interface ChargeRequest {
  amount: number;
  currency: string;
  token: string; // 前端从网关拿到的一次性支付 token
  idempotencyKey: string;
  /** 是否为后续扣款保存客户档案 token（订阅用） */
  saveProfile?: boolean;
}

export interface ChargeResult {
  success: boolean;
  transactionId: string;
  profileToken?: string; // 订阅复扣用的永久 token
  declineReason?: string;
}

export interface RefundRequest {
  transactionId: string;
  amount: number;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
}

export interface PaymentProvider {
  readonly name: string;
  charge(req: ChargeRequest): Promise<ChargeResult>;
  /** 用已保存的 profile token 复扣（订阅周期扣款） */
  chargeProfile(profileToken: string, amount: number, idempotencyKey: string): Promise<ChargeResult>;
  refund(req: RefundRequest): Promise<RefundResult>;
}
