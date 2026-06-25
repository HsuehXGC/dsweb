# DSweb 项目交接文档

> DS SmartLawn Service LLC 自建系统 —— 客户端网站 + 统一管理后台 + 支付网关。
> 本文档面向**接手开发的工程师/团队**，配合以下文档一起阅读：
>
> - [`ARCHITECTURE.md`](./ARCHITECTURE.md) —— 架构、数据模型、模块与 API 端点全图、代码约定
> - [`OPERATIONS.md`](./OPERATIONS.md) —— 环境搭建、运行、部署、故障排查（运维手册）
> - [`PAYMENT.md`](./PAYMENT.md) —— ProCharge 支付网关对接规格与当前进度（**接手重点**）
> - [`requirements/`](./requirements/) —— 原始需求 PDF（4 份）
> - 仓库根 [`/CLAUDE.md`](../CLAUDE.md) —— 给 AI/新人的速查（约定与易错点）

---

## 1. 这是什么

DS SmartLawn 是新英格兰（东马萨诸塞）的智能割草机器人销售与服务商。本系统数字化其全业务：

- **客户端网站**（`apps/web`）：品牌展示、产品销售、租赁、订阅会员、在线预约、会员中心，中英双语。
- **统一管理后台**（`apps/admin`）：整合 CMS / CRM / ERP / 客服 / 工单 五大子系统，按角色权限隔离。
- **支付**：抽象层 + 可插拔 Provider（当前 mock；正在接 ProCharge）。

三种消费场景：**买断**（线上付款）、**租赁/lease=租后转购**（线上付款）、**上门服务**（免费预约评估）。
买断/租赁付款后可选 **送货上门（加运费）** 或 **Burlington 门店自提 + 培训（免费）**。

## 2. 技术栈

| 层 | 选型 |
| --- | --- |
| 客户端 `web` | Next.js 15 (App Router) + Tailwind + next-intl（`/en` `/zh`） |
| 后台 `admin` | Next.js 15 + Ant Design 5 |
| 后端 `api` | NestJS 10（REST `/api/v1`）+ Prisma ORM |
| 数据库 | PostgreSQL 16；缓存/队列 Redis 7 |
| 构建 | pnpm 11 workspaces + Turborepo |
| 运行时 | Node 22 |

规模：**24 个后端业务模块**、**42 张数据表**、客户端 12 路由、后台 18 路由、~10.8k 行 TS/TSX、26 次提交。

## 3. 仓库与分支

- 远端：https://github.com/HsuehXGC/dsweb
- 分支：`main`(生产) / `develop`(集成) / `feature/*`。变更先 PR 到 `develop`，≥1 人 Review 后合并。
- 提交信息中文，结尾带 `Co-Authored-By`。

## 4. 5 分钟跑起来

详见 [`OPERATIONS.md`](./OPERATIONS.md)。最短路径：

```bash
docker compose up -d                  # Postgres + Redis
pnpm install
cp .env.example .env                  # 按需填值（本地默认即可跑）
pnpm db:generate && pnpm db:migrate   # 生成 Client + 建表
pnpm db:seed && pnpm db:seed:demo && pnpm db:seed:enrich   # 角色/超管 + 演示数据
pnpm dev                              # api:4000 web:3000 admin:3100
```

- 客户端 http://localhost:3000/en ｜ 后台 http://localhost:3100 ｜ Swagger http://localhost:4000/api/docs

**测试账号**（seed 预置）：

| 角色 | 账号 | 密码 | 用途 |
| --- | --- | --- | --- |
| 超级管理员 | `admin@dssmartlawn.com` | `ChangeMe123!` | 后台全权限 |
| 会员（客户） | `alice.reed@example.com` | `Demo1234!` | 客户端会员中心（有订单/订阅/服务记录） |
| 技师 | `mike.tech@dssmartlawn.com` | `Tech1234!` | 后台 `/tech` 移动端 |
| 调度员 | `dana.dispatch@dssmartlawn.com` | `Dispatch1234!` | 工单调度 |

> ⚠️ 生产部署前务必修改超管默认密码、所有 JWT/加密 secret。

## 5. 完成度总览

四阶段（Phase 1–4）软件交付**均已完成**。模块状态：

| 模块 | 状态 | 模块 | 状态 |
| --- | --- | --- | --- |
| M0 账号与权限(IAM) | ✅ | M5 工单系统 | ✅ |
| M1 CMS 内容 | ✅ | M6 预约系统 | ✅ |
| M2 CRM 客户 | ✅ | M7 营销活动 | ✅ |
| M3 ERP 资源 | ✅ | M8 数据分析 | ✅ |
| M4 客服系统 | ✅ | M9 系统配置 | ✅ |
| C1–C6 客户端（主页/产品/结账/订阅/会员中心/预约/服务/租赁/博客/关于） | ✅ | 支付抽象层 + Mock | ✅ |

逐模块的功能、关键文件、API 端点见 [`ARCHITECTURE.md`](./ARCHITECTURE.md)。

## 6. 接手时尚未完成 / 需要决策的事项 ⬅ 重点

### 6.1 支付网关（进行中，最高优先）
- 已实现支付抽象 `PaymentProvider`，当前默认 `MockPaymentProvider`（token 含 `decline` 模拟拒付）。
- 正在接 **ProCharge（Electronic Payments）dev-api REST**。**Provider 已写好**（JWT 登录→`/api/transaction`），但**登录请求体精确字段未确认**——他们 dev API 的 `/api/authentication/login` 目前返回 `500 substring`，需从 Swagger「Try it out」拿到准确请求格式。**详见 [`PAYMENT.md`](./PAYMENT.md)**。
- 切换方式：`.env` 设 `PAYMENT_GATEWAY=procharge`。买断/租赁/订阅业务层无需改动。

### 6.2 业务流程断点（部分已补，部分待办）
下单 → 交付的接力已补齐：付款 → 公司通知邮件 → 后台订单详情（履约可见）→ 分配业务员 → 一键派交付/培训工单（进调度看板）→ 登记设备（保修）。仍待办：

- **#6 订阅周期扣款无自动调度**：现靠后台「ERP → 订阅 → 运行到期扣款」手动触发，需接定时任务（`@nestjs/schedule` cron）。预约提醒邮件同理。
- **#7 客户端无退款/退货自助**：退款仅后台财务（`refunds.approve`）发起，会员中心无入口。

### 6.3 外部依赖 / 凭证（非代码）
- **真实邮件/SMS**：现为 console mock（`MailService` 打日志）。接 SendGrid/Twilio：填 `MAIL_PROVIDER` + 凭证（后台「系统配置」支持加密存储 API Key）。
- **发票 / 完工报告 PDF**：现仅生成记录 + 逻辑 URL（`/reports/...pdf`），未生成 PDF 二进制。待接 `pdfkit` + 对象存储（S3/R2）。
- **对象存储**：媒体库 / 照片 / PDF 的实际存储未接（`.env` 预留 S3 配置）。
- **安全审计 / PCI 复核 / 生产部署 / 灾备 / 员工培训**：需外部资源。

### 6.4 已知小缺口
- 后台 **`/users`、`/roles` 页面未做**（M0 仅有 API，菜单未挂）；需要可视化账号/权限矩阵时补。
- 完整总账/应收应付（COA/凭证）未自建（需求允许对接 QuickBooks）。
- 技师移动端 `/tech` 在 `admin` 应用内（内部用户会话），非独立 App（符合 V1 范围）。

## 7. 交接检查清单（建议接手第一周完成）

- [ ] 按 [`OPERATIONS.md`](./OPERATIONS.md) 在本机跑通三端 + Swagger
- [ ] 浏览器过一遍核心闭环：客户端下单（mock 支付）→ 后台订单详情处理 → 派工 → 技师 `/tech` 完工
- [ ] 通读 [`ARCHITECTURE.md`](./ARCHITECTURE.md) 的「约定与易错点」（API 信封解包 / BigInt / 双轨鉴权 / next-intl messages）
- [ ] 完成 ProCharge 登录字段确认并联调（[`PAYMENT.md`](./PAYMENT.md)）
- [ ] 规划生产部署（环境隔离、secret 管理、备份）
- [ ] 决策 #6/#7 与 PDF/邮件/对象存储 的优先级
