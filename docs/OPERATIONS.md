# DSweb 运维手册

## 1. 前置要求

- **Node 22+**、**pnpm 11+**（`corepack enable && corepack prepare pnpm@latest --activate`）
- **Docker**（本地 Postgres+Redis）或托管 Postgres(Neon/Supabase)+Redis(Upstash)
- 本机注意：本项目最初的开发机把 Node 装在 `~/.local/node`，PATH 写进 `~/.zshrc`；若命令找不到 `node`，前缀 `export PATH="$HOME/.local/node/bin:$PATH"`。新机器按标准安装 Node 即可，无需照搬。

## 2. 安装与初始化

```bash
docker compose up -d                  # 启动 dsweb-postgres(5432) + dsweb-redis(6379)
pnpm install
cp .env.example .env                  # 见下方「环境变量」
pnpm db:generate                      # 生成 Prisma Client
pnpm db:migrate                       # 应用迁移建表 (prisma migrate deploy/dev)
pnpm db:seed                          # 角色×10 + 超管 + 主页CMS + 产品 + 配置（必跑）
pnpm db:seed:demo                     # 演示客户/订单/工单/订阅…（可选，幂等）
pnpm db:seed:enrich                   # 活动/邮件/知识库/博客…（可选，幂等）
```

> **pnpm 构建脚本批准坑**：pnpm 11 默认不跑依赖的安装脚本。需要构建的包列在 `pnpm-workspace.yaml` 的 `onlyBuiltDependencies`（已含 prisma/@prisma/* /@nestjs/core/sharp 等）。新增此类依赖后跑 `pnpm rebuild <pkg>`（`pnpm install` 提示"已最新"会跳过构建）。忽略 linter 注入的 `allowBuilds` 占位块。

## 3. 运行

### 开发模式（热重载）
```bash
pnpm dev          # turbo 并行：api(4000) web(3000) admin(3100)
```
- 客户端 http://localhost:3000/en ｜ 后台 http://localhost:3100 ｜ Swagger http://localhost:4000/api/docs ｜ 健康 http://localhost:4000/api/v1/health

### 生产模式（单端）
```bash
pnpm build                                  # 全量构建
node apps/api/dist/main.js                  # API（读 .env）
pnpm --filter @dsweb/web start              # web (next start -p 3000)
pnpm --filter @dsweb/admin start            # admin (next start -p 3100)
```

## 4. 环境变量（`.env`，关键项）

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | Postgres 连接串 |
| `REDIS_URL` | Redis 连接串 |
| `JWT_INTERNAL_SECRET` / `JWT_CUSTOMER_SECRET` | 内部/客户 JWT 密钥（**生产必须改**） |
| `SETTINGS_ENCRYPTION_KEY` | M9 敏感配置 AES 加密密钥（≥16 字符，**生产必须改**） |
| `MAIL_PROVIDER` | `console`(默认 mock) / `sendgrid` / ... |
| `COMPANY_NOTIFY_EMAIL` | 新订单/预约通知收件人 |
| `PAYMENT_GATEWAY` | `mock`(默认) / `procharge` |
| `PROCHARGE_*` | 见 [PAYMENT.md](./PAYMENT.md) |
| `NEXT_PUBLIC_API_BASE_URL` | 前端调用的 API 基址（默认 `http://localhost:4000/api/v1`） |

前端构建期变量（`NEXT_PUBLIC_*`）改动后需**重新构建** web/admin 才生效。

## 5. 常用脚本

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` / `pnpm build` / `pnpm typecheck` | 全量开发/构建/类型检查 |
| `pnpm db:migrate` | 迁移（开发用 `prisma migrate dev`） |
| `pnpm --filter @dsweb/api exec prisma migrate deploy` | 生产迁移 |
| `pnpm --filter @dsweb/api exec prisma studio` | 可视化查库 |
| `pnpm db:seed[:demo|:enrich]` | 预置/演示/补充数据 |
| `pnpm format` | Prettier |

## 6. 数据库迁移流程

1. 改 `apps/api/prisma/schema.prisma`
2. 开发：`pnpm db:migrate`（`prisma migrate dev` 生成迁移 + 应用）
3. 提交 `prisma/migrations/` 下新增的迁移目录
4. 生产/CI：`prisma migrate deploy`
- Prisma Client 改 schema 后需 `pnpm db:generate`（dev 会自动）

## 7. 部署建议（生产）

V1 推荐 PaaS（Render/Railway）降低运维：
1. 三个服务分别部署（api / web / admin），或 web+admin 同 Vercel、api 上 Render。
2. 托管 Postgres + Redis；`DATABASE_URL`/`REDIS_URL` 走密钥管理（勿入库）。
3. 部署流程：`pnpm install --frozen-lockfile` → `prisma migrate deploy` → `pnpm build` → 启动。
4. CI 已有 `.github/workflows/ci.yml`（install→generate→typecheck→lint→build→test）。
5. 上线前：改默认超管密码、轮换所有 secret、启用 HTTPS/HSTS、配置备份（每日）与监控（Sentry/UptimeRobot）。
6. 环境隔离：dev / staging / production 三套，数据库独立。

## 8. 故障排查（踩过的坑）

| 现象 | 原因 / 解决 |
| --- | --- |
| `pnpm dev` 报端口 3000/3100/4000 被占 | 旧进程残留。`lsof -ti tcp:3000 \| xargs kill -9`；或 `pkill -f 'next/dist/bin/next'` + `pkill -f 'dist/main.js'` |
| 某页面 dev 下 500 `Cannot find module './vendor-chunks/...'` | Next dev 增量缓存损坏（频繁改文件后）。删 `apps/web/.next`（或 admin）后重启 dev |
| 客户端所有文案显示成 `nav.book` 等 key | `[locale]/layout.tsx` 漏传 `messages` 给 `NextIntlClientProvider` |
| 后台列表空但接口有数据 | admin `request()` 自动解包 `.data`，分页接口返回的是数组——用 `res` 而非 `res.data` |
| `prisma migrate` 报缺 `DATABASE_URL` | `.env` 未配或未被读取；`apps/api/.env` 是指向根 `.env` 的软链 |
| 调 ProCharge dev API 返回 403 | 其 WAF 拦截非浏览器 UA，请求需带浏览器 `User-Agent`（Provider 已内置） |

## 9. 备份与数据

- 演示库当前有约 19 客户 / 29 订单 / 19 工单 / 8 产品 / 多用户。重置：删容器卷 `docker compose down -v` 后重新 migrate+seed。
- 重要表软删除（`deletedAt`），不物理删除。
- 备份：`pg_dump`；恢复演示数据用 seed 脚本（幂等）。
