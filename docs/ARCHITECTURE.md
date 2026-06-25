# DSweb 架构说明

## 1. 总体架构

前后端分离 + 单体后端（V1 不引入微服务）。

```
┌──────────────────┐   ┌──────────────────┐
│ 客户端 web        │   │ 管理后台 admin    │
│ Next.js 15        │   │ Next.js 15 + AntD │
│ next-intl /en /zh │   │ 内部用户会话      │
└────────┬─────────┘   └─────────┬────────┘
         │  REST /api/v1 (JSON, JWT Bearer)  │
         └──────────────┬───────────────────┘
                        ▼
        ┌───────────────────────────────┐
        │ NestJS API (apps/api)          │
        │  全局 JwtAuthGuard + PermissionsGuard (RBAC) │
        │  TransformInterceptor / HttpExceptionFilter  │
        │  24 业务模块                    │
        │  Prisma ORM                     │
        └───────┬───────────────┬────────┘
                ▼               ▼
          PostgreSQL 16      Redis 7
                │
                ▼
        第三方：支付(ProCharge) / 邮件 / SMS / 地图（Provider 抽象，当前多为 mock）
```

## 2. 目录结构

```
dsweb/
├── apps/
│   ├── api/                NestJS 后端
│   │   ├── prisma/         schema.prisma(42 表) + seed.ts + seed-demo.ts + seed-enrich.ts + migrations/
│   │   └── src/
│   │       ├── auth/ rbac/ users/ roles/ audit/    # M0 IAM + 鉴权
│   │       ├── cms/                                # M1
│   │       ├── crm/                                # M2 (leads/customers/deals/activities)
│   │       ├── products/ inventory/ orders/        # M3 ERP
│   │       ├── commerce/ payment/                  # C3 结账 + 支付抽象
│   │       ├── customer-auth/ subscriptions/       # C5 客户认证 + C4 订阅
│   │       ├── support/                            # M4 客服
│   │       ├── work-orders/ appointments/          # M5 工单 + M6 预约
│   │       ├── analytics/ marketing/ refunds/      # M8 + M7 + 退款
│   │       ├── settings/ mail/ health/             # M9 + 邮件 + 健康检查
│   │       └── common/ main.ts app.module.ts
│   ├── web/                客户端（src/app/[locale]/*、components/、lib/、messages/{en,zh}.json）
│   └── admin/              后台（src/app/*、components/DashboardShell、lib/api.ts、lib/session）
├── packages/
│   ├── types/              前后端共享类型（RBAC 角色/权限、API 信封 ApiResponse）
│   └── config/             共享 tsconfig（base / nestjs / nextjs）
├── docs/                   本套交接文档 + requirements/
├── docker-compose.yml      Postgres + Redis
├── turbo.json / pnpm-workspace.yaml
└── .env.example
```

## 3. 鉴权模型（双轨）

| | 内部用户（员工） | 终端客户 |
| --- | --- | --- |
| 登录 | `POST /api/v1/auth/login` | `POST /api/v1/public/customer/login` |
| Secret | `JWT_INTERNAL_SECRET` | `JWT_CUSTOMER_SECRET`（audience=`customer`） |
| 守卫 | 全局 `JwtAuthGuard` + `PermissionsGuard` | `CustomerJwtGuard`（路由级） |
| Token | access 1h + refresh 7d（sessions 表，可强制下线） | access + refresh（JWT） |

- **全局守卫**：所有路由默认需内部用户 JWT；用 `@Public()` 跳过（公开接口、客户接口）。
- **RBAC**：`@RequirePermissions('orders.write')`，`PermissionsGuard` 校验 `request.user.permissions`；支持 `resource.*` 与 `*.*` 通配。10 个预置角色 + 权限点见 `packages/types/src/rbac.ts` 与 `prisma/seed.ts`。
- **客户路由**（`/customer/*`、`/customer/subscriptions/*`）：类上加 `@Public()`（跳过内部守卫）+ `@UseGuards(CustomerJwtGuard)`。

## 4. API 端点分组（前缀 `/api/v1`）

| 前缀 | 用途 | 鉴权 |
| --- | --- | --- |
| `/public/*` | 无需登录：产品、CMS 页面/博客、结账询价/下单、预约提交、客户注册/登录、客服提交、公开配置 | 无（速率限制） |
| `/customer/*` | 终端客户登录后：me、orders、subscriptions、devices、work-orders、appointments、referral、订阅自助 | CustomerJwtGuard |
| `/admin/*` | 管理后台：受 RBAC 保护 | JwtAuthGuard + RBAC |
| `/tech/*` | 技师移动端：today、打卡、完工 | RBAC `work_orders.*_own` |

### 关键端点速查（按模块）

- **M0** `auth/login|refresh|logout|me`、`admin/users`、`admin/roles`、`admin/permissions`、`admin/audit-logs`
- **M1** `public/pages/:slug`、`public/posts`、`admin/cms/pages|sections|blocks`
- **M2** `admin/crm/leads`(+`/:id/convert`)、`admin/crm/customers`(+`/:id` 360、`/:id/properties`、`/:id/devices`)、`admin/crm/deals/board`、`admin/crm/activities`
- **M3** `public/products`、`admin/products`、`admin/inventory`(+`/set-stock`)、`admin/orders`(+`/:id`、`/:id/status`、`/:id/owner`)
- **C3** `public/checkout/quote`、`public/checkout`（接受 `fulfillment: delivery|pickup`）
- **C4** `customer/subscriptions/subscribe|:uuid/pause|resume|cancel`、`admin/subscriptions`、`admin/billing/run-due`
- **C5** `public/customer/register|login|refresh`、`customer/me|orders|subscriptions|devices|work-orders`
- **M4** `public/support/contact`、`public/kb`、`admin/support/tickets`(+`/:id`、`/:id/reply`)、`admin/support/kb`
- **M5** `admin/work-orders`(+`/board`、`/:id`、`/:id/assign`、`/technicians`)、`tech/today`、`tech/work-orders/:id/clock/:event|complete`
- **M6** `public/appointments`、`admin/appointments`(+`/:id/confirm`、`/time-slots`)
- **M7** `admin/marketing/discounts|campaigns|referrals`、`customer/referral`
- **M8** `admin/analytics/dashboard|conversion-funnel|sales-by-product|subscriptions`
- **M9** `admin/settings`、`public/settings`
- **退款** `admin/refunds`、`admin/payments/:id/refund`

完整可交互文档：Swagger `http://localhost:4000/api/docs`。

## 5. 数据模型（核心实体，共 42 表）

详细字段见 `apps/api/prisma/schema.prisma`。关键关系：

- `Customer` 1—N `Property`/`Device`/`Order`/`Subscription`/`Deal`/`Activity`/`WorkOrder`/`Appointment`/`SupportTicket`
- `Order` 1—N `OrderItem`(→`Sku`→`Product`)、1—N `Payment`(1—N `Refund`)、1—N `Invoice`；`Order.shippingAddress` JSON 内含 `{ method: delivery|pickup, ... }` 履约信息
- `Sku` × `Warehouse` → `Inventory`（available/allocated/inTransit/lowWatermark）
- `Appointment` 确认后 1—1 `WorkOrder`；`WorkOrder` 1—N `TimeEntry`，关联 `Technician`(→`User`)
- `User` N—1 `Role` N—N `Permission`；所有写操作 → `AuditLog`
- `Subscription.gatewayProfileToken` 存网关返回的复扣 token（绝不存卡号）

设计原则：软删除(`deletedAt`)、时间戳、对外 UUID + 内部 bigint id、外键/约束在 DB 层强制、状态/时间/外键建索引、敏感配置加密。

## 6. 约定与易错点（务必先读）⬅

- **API 信封**：成功 `{data, meta}` / 失败 `{error:{code,message}}`（全局 `TransformInterceptor` + `HttpExceptionFilter`）。
  - admin 的 `request()`（`apps/admin/src/lib/api.ts`）会**自动解包 `.data`**。所以**分页接口**（service 返回 `{data,meta}`）解包后**直接是数组**——列表类 api 方法返回数组、页面用 `res` 而非 `res.data`。这是踩过的坑。
- **BigInt**：Prisma 主键是 BigInt，`main.ts` 全局 `BigInt.prototype.toJSON = ()=>string`。前端一律当字符串处理。
- **next-intl**：`apps/web/src/app/[locale]/layout.tsx` 必须给 `NextIntlClientProvider` 传 `messages={await getMessages()}`，否则**所有客户端组件显示 i18n key**。新增用 `useTranslations` 的客户端组件即依赖此。
- **Prisma JSON**：`Record<string,unknown>` 不能直接赋给 Prisma JSON 字段，需 `as Prisma.InputJsonValue`。
- **编号**：APT/WO/ORD/INV/TKT/QUO 用 `前缀-YYYY-NNNNN`——先建占位 number，拿到自增 id 后回填正式编号。
- **支付抽象**：`apps/api/src/payment/`。换网关＝实现 `PaymentProvider` 接口（charge/chargeProfile/refund）+ 在 `PaymentService.provider()` 加分支。详见 PAYMENT.md。
- **库存扣减**：实物订单 `OrdersService.markPaid` 扣主仓并自动开票；订阅/服务类订单空明细不扣；技师完工扣车上库存（vehicle 仓）。
- **构建产物**：`apps/api` 的 `tsconfig.build.json` 排除了 `prisma/`，确保产物在 `dist/main.js`（否则会落到 `dist/src/main.js`）。

## 7. 业务流程（端到端）

1. **买断/租赁下单**：加购 → `/checkout`（选送货/自提）→ `public/checkout`（找/建客户 → 建单 → 扣款(mock/ProCharge) → 扣库存 → 自动开票 → 客户确认邮件 + 公司通知邮件）。
2. **后台处理**：`/erp/orders/:id` → 看履约 → 分配业务员 → 一键创建交付/培训工单（→ 调度看板）→ 登记设备（保修 → 客户「我的设备」）。
3. **预约→服务**：`/book` 提交 → 建预约+线索 → 后台 `/service/appointments` 确认（自动建客户/地块/工单）→ 调度看板派技师 → 技师 `/tech` 打卡/完工（照片/签名/配件/报告）。
4. **订阅**：会员中心订阅 → 首期扣款 + 存 vault token → `admin/billing/run-due` 周期复扣（**待接 cron**）。
5. **客服**：客户端提交咨询 → 收件箱 → 一屏客户视图 → 回复（发邮件）/内部备注 → 转工单/退款。
