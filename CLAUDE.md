# CLAUDE.md — DSweb 开发指南

DS SmartLawn 自建系统：客户端网站 + 统一管理后台 + 支付网关。monorepo（pnpm + Turborepo）。

## 工具链
- Node 22（本机装于 `~/.local/node`，PATH 在 `~/.zshrc`）。命令找不到 node 时前缀 `export PATH="$HOME/.local/node/bin:$PATH"`。
- pnpm 11。新增带安装脚本的依赖后，把包名加进 `pnpm-workspace.yaml` 的 `onlyBuiltDependencies`，再 `pnpm rebuild <pkg>`（install 会说"已最新"跳过构建）。忽略 linter 注入的 `allowBuilds` 块。

## 常用命令
```bash
docker compose up -d                                   # Postgres + Redis
pnpm install
pnpm --filter @dsweb/api exec prisma migrate deploy    # 建表（或 pnpm db:migrate 开发）
pnpm db:seed                                           # 角色/超管/主页/产品/配置
pnpm dev                                               # api:4000 web:3000 admin:3100
pnpm build && pnpm typecheck                           # 全量
```
默认超管 `admin@dssmartlawn.com / ChangeMe123!`。Swagger `:4000/api/docs`。

## 结构
- `apps/api`（NestJS）：每个业务模块一个目录（auth/rbac/cms/crm/products/inventory/orders/commerce/payment/subscriptions/customer-auth/work-orders/appointments/support/analytics/marketing/refunds/settings/...）。Prisma schema 在 `prisma/schema.prisma`，seed 在 `prisma/seed.ts`。
- `apps/web`（Next.js）：客户端，next-intl 双语 `/en` `/zh`，App Router。
- `apps/admin`（Next.js + Ant Design）：管理后台。
- `packages/types`：前后端共享类型（RBAC、API 信封）。

## 约定 / 易错点
- **API 信封**：成功 `{data,meta}` / 失败 `{error:{code,message}}`（全局拦截器+过滤器）。admin 的 `request()` 会自动解包 `.data`——分页接口（返回 `{data,meta}`）解包后直接是数组，列表 api 方法返回数组、页面用 `res` 不要 `res.data`。
- **BigInt**：Prisma 主键是 BigInt，`main.ts` 里全局 `BigInt.prototype.toJSON`。前端当字符串处理。
- **鉴权双轨**：内部用户全局 `JwtAuthGuard`（JWT_INTERNAL_SECRET）+ `PermissionsGuard`（`@RequirePermissions`）。客户走 `CustomerJwtGuard`（JWT_CUSTOMER_SECRET，audience=customer）。客户路由要加 `@Public()` 跳过内部全局守卫，再 `@UseGuards(CustomerJwtGuard)`。
- **next-intl**：`[locale]/layout.tsx` 必须给 `NextIntlClientProvider` 传 `messages={await getMessages()}`，否则所有客户端组件显示 i18n key。新客户端组件用 `useTranslations` 即依赖此。
- **编号**：APT/WO/ORD/INV/TKT/QUO 等用 `前缀-YYYY-NNNNN`（先建占位 number，拿 id 后回填）。
- **支付**：抽象在 `apps/api/src/payment/`，`MockPaymentProvider`（token 含 `decline` 模拟拒付）。换真实网关＝实现 `PaymentProvider` 接口 + `PaymentService.provider()` 加分支。
- **库存**：实物订单 `markPaid` 扣主仓；订阅/服务类订单空明细不扣；技师完工扣车上库存。
- **Prisma JSON**：`Record<string,unknown>` 不能直接给 Prisma JSON 字段，需 `as Prisma.InputJsonValue`。

## 提交
- 分支 `main`(生产)/`develop`(集成)/`feature/*`。提交信息中文，结尾 `Co-Authored-By: Claude ...`。
- 改动后跑 `pnpm typecheck` + 相关 `pnpm --filter <app> build`。涉及 UI 用 preview 验证（注意：preview 工具多次调用间会把页面重置回根路由，验证用截图+在页面上下文跑 fetch）。
