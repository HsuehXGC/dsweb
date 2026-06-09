# DSweb — DS SmartLawn 自建系统

DS SmartLawn Service LLC 的全业务数字化系统：**客户端网站 + 统一管理后台 + 银行支付网关**，
整合 CMS / CRM / ERP / 客服 / 工单 五大子系统，按角色权限隔离。

需求文档见 [`docs/requirements/`](docs/requirements/)。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 客户端前端 | Next.js 15 (App Router) + Tailwind CSS + next-intl（中英双语 /en /zh） |
| 管理后台前端 | Next.js 15 + Ant Design 5 |
| 后端 API | NestJS 10（REST `/api/v1`）+ Prisma ORM |
| 数据库 | PostgreSQL 16 |
| 缓存/队列 | Redis 7 |
| 包管理 / 构建 | pnpm workspaces + Turborepo |

## 目录结构

```
dsweb/
├── apps/
│   ├── api/      NestJS 后端（Prisma schema、RBAC、各业务模块）
│   ├── web/      客户端网站（双语、SSR、主页 9 section）
│   └── admin/    管理后台前端（Ant Design）
├── packages/
│   ├── types/    前后端共享 TS 类型（RBAC、API 信封）
│   └── config/   共享 tsconfig
├── docs/requirements/   需求 PDF
└── docker-compose.yml   本地 Postgres + Redis
```

## 本地开发

### 1. 前置要求

- Node.js 22+（本机已装于 `~/.local/node`，PATH 已写入 `~/.zshrc`）
- pnpm 11+（`corepack enable`）
- PostgreSQL 16 + Redis（二选一）：
  - **Docker**：`docker compose up -d`
  - **托管**：Neon/Supabase（Postgres）+ Upstash（Redis），连接串填入 `.env`

### 2. 安装与配置

```bash
pnpm install
cp .env.example .env      # 填入 DATABASE_URL 等
pnpm db:generate          # 生成 Prisma Client
pnpm db:migrate           # 建表（需数据库可连接）
pnpm db:seed              # 预置 10 个标准角色 + 超管账号
```

### 3. 启动

```bash
pnpm dev                  # 同时启动 api(4000) / web(3000) / admin(3100)
```

- 客户端网站：http://localhost:3000 （自动跳转 `/en`）
- 管理后台：http://localhost:3100
- API 文档（Swagger）：http://localhost:4000/api/docs
- 健康检查：http://localhost:4000/api/v1/health

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动全部应用（开发模式） |
| `pnpm build` | 构建全部应用 |
| `pnpm typecheck` | 全量类型检查 |
| `pnpm db:migrate` | 运行数据库迁移 |
| `pnpm format` | Prettier 格式化 |

## 分支策略

- `main`：生产；`develop`：集成；`feature/*`：特性。
- 所有变更先 PR 到 `develop`，至少 1 人 Review 后合并。

## 模块完成度

| 模块 | 内容 | 状态 |
| --- | --- | --- |
| M0 IAM | 账号/角色/权限/审计、JWT、RBAC | ✅ |
| M1 CMS | 页面/Section/Block、双语、媒体、后台编辑 | ✅ |
| M2 CRM | 线索/转客户、客户360、流水线看板、活动 | ✅ |
| M3 ERP | 产品/SKU、库存、订单、采购 | ✅ |
| M4 客服 | 收件箱、对话、一屏客户视图、知识库、SLA | ✅ |
| M5 工单 | 调度看板、技师移动端、打卡、完工报告 | ✅ |
| M6 预约 | 三类型提交、审批转工单、时段 | ✅ |
| M7 营销 | 折扣码、推荐返现、邮件群发 | ✅ |
| M8 分析 | 仪表板、转化漏斗、销售/订阅报表 | ✅ |
| M9 配置 | 品牌/税费/支付等，敏感项加密 | ✅ |
| C1–C6 客户端 | 主页/产品/结账/订阅/会员中心/预约，双语 | ✅ |
| 支付 | 抽象层 + Mock 网关（真实银行待 KYC） | ✅ |

四阶段（Phase 1–4）软件交付均已完成。

## 待人工/外部跟进

- **真实银行支付网关**：需 KYC（4–8 周）。现为 mock，实现 `PaymentProvider` 接口即可替换。
- **真实邮件/SMS**：现为 console mock，在后台「系统配置」填 SendGrid/Twilio 凭证。
- **发票 PDF / 完工报告 PDF**：现生成记录与逻辑 URL，待接 pdfkit + 对象存储。
- **安全渗透测试 / PCI 复核 / 生产部署 / 员工培训**：需外部资源与凭证。
- **后台 `/users`、`/roles` 页面**：M0 仅 API，界面待补。
