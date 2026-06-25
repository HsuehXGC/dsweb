# 支付对接说明（ProCharge / Electronic Payments）

> 接手重点。当前支付默认 **mock**（模拟成功）；ProCharge Provider 已写好，差最后的「登录请求精确字段」确认即可联调。

## 1. 支付抽象（已就绪）

`apps/api/src/payment/`：

- `payment.provider.ts` —— 接口 `PaymentProvider`：
  - `charge({ amount, currency, token, idempotencyKey, saveProfile })` → `{ success, transactionId, profileToken?, declineReason? }`
  - `chargeProfile(profileToken, amount, idempotencyKey)` —— 订阅复扣（用保存的 token）
  - `refund({ transactionId, amount })` → `{ success, refundId }`
- `mock.provider.ts` —— `MockPaymentProvider`（默认）。token 含 `decline` 模拟拒付；`saveProfile` 返回假 vault token。
- `procharge.provider.ts` —— `ProChargeProvider`（见下）。
- `payment.service.ts` —— `provider()` 按 `PAYMENT_GATEWAY` 选 provider（`procharge`→ProCharge，否则 mock）；负责记 `payments`/`refunds` 流水 + 幂等。

**业务层无需感知具体网关**：`commerce`（结账）、`subscriptions`（订阅）、`refunds` 都只调 `PaymentService`。切网关只改 `.env` 的 `PAYMENT_GATEWAY`。

## 2. 前端令牌化流程（现状）

结账页 `apps/web/src/components/CheckoutClient.tsx`：前端拿到 `payment_token` → `public/checkout` → 后端 `PaymentService.chargeOrder({ token })`。

- **沙箱开发**：直接用 ProCharge 提供的**测试 token**（见 §5）填入结账页的 token 输入框即可走通。
- `CollectJsFields.tsx`：预留的 Collect.js 令牌化组件（卡号进网关 iframe，PCI SAQ-A），仅当 `NEXT_PUBLIC_PAYMENT_TOKENIZATION_KEY` 配置时启用，否则回退 token 输入框。**注意**：Collect.js 属于 ProCharge 旧网关(secure2)的方案；若最终走 dev-api REST 的 `/api/token` 令牌化，需相应调整前端（见 §6）。

## 3. ProCharge dev-api REST（目标网关）

- 文档：https://dev-api.procharge.com/api/swagger （OAS 3.1，JS 渲染页面）
- 服务器：`https://dev-api.procharge.com`
- 鉴权：`POST /api/authentication/login`（用供给的凭证）→ 返回 `access_token` → 之后所有请求带 `Authorization: Bearer <token>`
- 关键端点：`POST /api/transaction`（下单 sale/refund）、`POST /api/token`（令牌化）、`POST /api/gateway/invoice`（YouPay 电子发票）、`GET /api/healthcheck`
- 沙箱商户号：Fiserv `518564990154510`、Cygma `889901550594702`
- 凭证（测试，来自供应商邮件）：Login ID `TestDemo` / Reg Key `TestDemo` / Password `ProCharge3!`

`ProChargeProvider` 已实现：JWT 登录（内存缓存）→ `/api/transaction`（`transactionType: sale|refund` + `token`）。

## 4. ⚠️ 当前阻塞点（接手第一件事）

实测 dev API：
1. **WAF 拦截非浏览器 UA** —— curl/node 默认 UA 返回 `403 Forbidden`。Provider 已对所有请求加浏览器 `User-Agent`（必需）。
2. **登录返回 500** —— 加 UA 后 `POST /api/authentication/login` 不论 body 怎么传都返回 `{"message":"Cannot read properties of undefined (reading 'substring')"}`，说明缺一个**精确字段或必需请求头**，只能从 Swagger 拿。

**如何解阻塞**：在 Swagger 页面对 `POST /api/authentication/login` 点「Try it out」→ 填凭证 → Execute，记录：
- 实际发送的 **Request body**（精确字段名）
- 生成的 **curl**（看有无额外必需 header，如 subscription key）
- 成功响应里 **access_token 的字段路径**

然后核对/修正 `procharge.provider.ts` 里的 `getJwt()` 请求体与 `charge()`/`refund()` 的字段映射（代码里已用注释标出「待按 schema 核对」的位置）。同样确认 `transaction` / `transactionResponse` 的字段名（金额/token/类型/响应码/交易号）。

## 5. 测试卡 / token（Fiserv 沙箱商户 `518564990154510`）

**批准**：Visa token `345678901`（卡 `4761120010000492` CVV123 EXP1225）、MasterCard `567890123`、Amex `123456789`、Discover `789012345`
**拒付**：Visa token `458967677`、Amex `345345567`、MasterCard `598723233`、Discover `609873423`

## 6. 联调步骤（拿到登录字段后）

```bash
# .env
PAYMENT_GATEWAY=procharge
PROCHARGE_BASE_URL=https://dev-api.procharge.com
PROCHARGE_LOGIN_ID=TestDemo
PROCHARGE_REG_KEY=TestDemo
PROCHARGE_PASSWORD=ProCharge3!
PROCHARGE_MERCHANT=518564990154510
```
1. 修正 `getJwt()` 与字段映射后，`pnpm --filter @dsweb/api build` 重启 api。
2. 用测试 token `345678901` 走一遍 `public/checkout` → 应返回 paid；用 `458967677` → 应拒付 400。
3. 验证订阅：首期 `saveProfile`→拿 vault/profile token；`admin/billing/run-due` 复扣。
4. 验证退款：`admin/payments/:id/refund`。
5. 注意本机连其 API 需出网；若环境有 IP 白名单要求，在白名单内或代理环境联调。

## 7. 生产 / PCI 注意

- **卡号绝不进我们服务器/日志**：生产用令牌化（Collect.js 或 dev-api `/api/token` 的前端方案），后端只收 token。当前结账的明文 token 输入框仅用于**沙箱测试**，生产前替换为令牌化字段。
- 退款仅 `Super Admin`/`Finance`（`refunds.approve`）可发起。
- Webhook 验签、对账、加密存储密钥（M9 settings 已支持加密）按需求文档第七章补齐。

## 8. 四种消费模式与扣款方式

| 模式 | 实现 | 扣款 |
| --- | --- | --- |
| 买断 | 一次性商品下单 | `charge`（sale 一次性） |
| 租赁 / lease(租后转购) | 租赁商品（RENT-WEEKEND/MONTHLY/TO-OWN）一次性下单 | `charge`（sale 一次性） |
| 订阅会员 | `subscriptions` + Customer Vault | 首期 `charge(saveProfile)` → 周期 `chargeProfile` |

> 用户备注：租赁、lease、订阅未来可能各走不同扣款流程；抽象层已支持按模式分别处理，扩展时在 `commerce`/`subscriptions` 内分流即可，Provider 接口不变。
