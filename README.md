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

## 开发阶段（对应需求文档第九章）

- **Phase 1 基础设施**（进行中）：脚手架 ✅ · 数据库 schema ✅ · M0 IAM · M1 CMS · C1 主页骨架
- **Phase 2 核心业务**：电商支付、订单、订阅、CRM、ERP
- **Phase 3 运营闭环**：工单、技师移动端、客服、预约、会员中心
- **Phase 4 上线打磨**：数据分析、营销、性能、安全审计、生产部署
