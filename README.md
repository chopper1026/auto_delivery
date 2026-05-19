# Auto Delivery

Auto Delivery 是一个卡密自动发货系统。用户无需登录，输入卡密后即可领取文本货物或一次性下载文件 ZIP；管理员通过后台维护货物、文件库存、卡密、系统设置和审计日志。

## 当前能力

- 公开兑换页：用户输入卡密，成功后跳转到兑换凭证页。
- 文本货物：兑换后直接展示文本内容。
- 文件货物：管理员上传 JSON 文件库存，生成卡密时预留指定数量文件，用户兑换后只允许下载一次 ZIP。
- 管理后台：登录、工作台统计、货物管理、卡密生成与删除、日志查询、系统设置。
- 文件库存管理：区分可用、预留、已兑换状态，支持导出未兑换/已兑换库存包，并附带 `manifest.csv`。
- 卡密交付文案：可在后台配置服务地址和卡密交付消息模板。
- 安全控制：管理员登录限流、公开兑换限流、公开下载限流、CSRF 校验、Argon2 密码哈希、HMAC 形式的卡密/凭证 token 查询哈希。
- 下载保护：文件下载采用 claim 状态机，下载流真正结束后才标记为已下载；中断或文件缺失会释放 claim，避免慢下载/并发请求造成重复发货。

## 技术栈

- Next.js `16.2.6` App Router
- React `19.2.4`
- TypeScript
- Prisma `7.8.0`
- PostgreSQL
- Tailwind CSS v4
- Vitest
- Docker / Docker Compose

> 注意：本项目使用的 Next.js 版本包含和旧版本不同的约定。修改 Next 配置、路由处理器或 Server Actions 前，先阅读 `node_modules/next/dist/docs/` 中对应文档。

## 环境要求

- Node.js 22+；生产镜像使用 `node:24-alpine`
- npm
- PostgreSQL 16+
- Docker 和 Docker Compose（可选，但推荐用于本地数据库和生产部署）

## 环境变量

复制模板后按环境修改：

```bash
cp .env.example .env
```

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `POSTGRES_PASSWORD` | Docker 部署必填 | Compose 中 PostgreSQL 的数据库密码。 |
| `DATABASE_URL` | 是 | 应用数据库连接串，例如 `postgresql://auto_delivery:password@localhost:5432/auto_delivery?schema=public`。 |
| `TEST_DATABASE_URL` | 否 | 测试数据库连接串；未设置时测试脚本会从 `DATABASE_URL` 派生 `schema=test`。 |
| `ADMIN_USERNAME` | 是 | 初始化管理员用户名。 |
| `ADMIN_PASSWORD` | 是 | 初始化管理员密码，至少 12 位。生产环境必须换成强随机密码。 |
| `SECRET_PEPPER` | 是 | 至少 32 字符，用于卡密、凭证 token、CSRF 等查询哈希。修改后既有卡密和凭证 token 会失效。 |
| `SESSION_COOKIE_NAME` | 否 | 管理后台 session cookie 名称，默认 `auto_delivery_admin`。 |
| `APP_BASE_URL` | 是 | 对外服务地址，用于生成卡密交付文案里的兑换链接。生产环境应使用 HTTPS。 |
| `STORAGE_ROOT` | 否 | 本地文件存储根目录，默认 `./storage`。 |
| `ADMIN_UPLOAD_BODY_LIMIT` | 否 | Next Server Actions 请求体上限，默认 `100mb`。 |
| `NODE_ENV` | 否 | `development`、`test` 或 `production`。 |

## 本地开发

1. 安装依赖：

```bash
npm install
```

2. 启动 PostgreSQL：

```bash
docker compose up -d postgres
```

3. 生成 Prisma Client 并执行迁移：

```bash
npm run prisma:generate
npm run prisma:migrate
```

4. 初始化第一个管理员：

```bash
npm run init:admin
```

5. 启动开发服务器：

```bash
npm run dev
```

访问地址：

- 用户兑换页：`http://localhost:3000`
- 管理后台：`http://localhost:3000/admin`

## 常用命令

```bash
npm run dev                    # 启动本地开发服务器
npm run build                  # 生产构建
npm run start                  # 启动生产构建产物
npm run lint                   # ESLint
npm run typecheck              # TypeScript 类型检查
npm run test                   # 执行迁移后运行测试
npm run test:watch             # Vitest watch 模式
npm run prisma:generate        # 生成 Prisma Client
npm run prisma:migrate         # 本地开发迁移
npm run prisma:migrate:deploy  # 生产迁移
npm run init:admin             # 如果没有管理员，则创建初始管理员
```

`npm run test` 会强制使用测试 schema，并在运行 Vitest 前执行 `prisma migrate deploy`。如果没有配置 `TEST_DATABASE_URL`，脚本会从 `DATABASE_URL` 派生测试连接串，避免清理开发库的业务数据。

## 管理后台流程

1. 登录 `/admin`。
2. 在「货物」中创建文本货物或文件货物。
3. 文件货物只接受 JSON 文件上传；单文件最大 `5MB`，单次最多 `200` 个文件，总大小最大 `100MB`。
4. 在「卡密」中选择货物、有效期和文件数量生成卡密。
5. 文本货物卡密不占用文件库存；文件货物卡密会在生成时预留库存。
6. 复制生成的卡密或交付文案给用户。
7. 在「日志」中查看兑换、下载和后台操作记录。
8. 在「设置」中维护服务地址和卡密交付消息模板。

## 用户兑换流程

1. 用户访问 `/`，输入卡密。
2. 系统校验卡密状态、有效期和货物状态。
3. 文本货物直接在凭证页展示文本内容。
4. 文件货物在兑换时生成 ZIP，并在凭证页提供下载按钮。
5. 文件 ZIP 只能成功下载一次；重复下载会跳转到 `/download/already-downloaded`。

## 存储与数据

- 上传文件保存在 `STORAGE_ROOT/uploads`。
- 兑换生成的 ZIP 保存在 `STORAGE_ROOT/zips`。
- 临时文件目录为 `STORAGE_ROOT/tmp`。
- Docker 部署时，应用存储挂载到 `app-data` volume，数据库挂载到 `postgres-data` volume。
- 文件存储和数据库记录必须一起备份；不要只备份数据库或只备份文件目录。

## Docker 生产部署

生产部署推荐使用 Compose，并通过环境变量传入敏感配置：

```bash
POSTGRES_PASSWORD="replace-with-random-password" \
ADMIN_USERNAME="admin" \
ADMIN_PASSWORD="replace-with-long-password" \
SECRET_PEPPER="replace-with-at-least-32-random-bytes" \
APP_BASE_URL="https://example.com" \
docker compose up -d --build
```

部署特性：

- `postgres` 服务带健康检查，不对宿主机发布 `5432`。
- `app` 容器等待数据库健康后启动。
- `app` 启动入口会先执行 `npx prisma migrate deploy`，再执行 `npm run start`。
- 运行时以 `node` 用户启动应用。
- 生产环境通过 `APP_BASE_URL` 配置对外 HTTPS 地址。

生产前检查：

1. 使用强随机 `POSTGRES_PASSWORD`、`ADMIN_PASSWORD`、`SECRET_PEPPER`。
2. 确认 `APP_BASE_URL` 是 HTTPS 生产域名。
3. 通过反向代理暴露应用，不直接暴露 PostgreSQL。
4. 同时备份 `postgres-data` 和 `app-data`。
5. 多实例或滚动部署前，配置一致的 `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`，并为 Next.js 配置稳定的 deployment id 策略。

## 安全与运维注意事项

- `.env` 不应提交到 Git。
- `SECRET_PEPPER` 参与敏感 token 查询哈希，变更后已有卡密和兑换凭证 token 无法继续匹配。
- 管理后台密码使用 Argon2 哈希保存。
- 管理后台操作使用 CSRF token 校验。
- 登录、公开兑换和公开下载均有数据库限流桶。
- 文件下载 claim 默认有效期为 10 分钟；进程崩溃时可能留下 `IN_PROGRESS` 状态，需要通过运维脚本或后台维护流程人工处理。
- 文件库存预留使用数据库事务和 `FOR UPDATE SKIP LOCKED`，用于降低并发生成卡密时重复预留的风险。
- 依赖通过 `overrides` 固定了受影响的传递依赖版本；升级 Next.js 或 Prisma 后需要重新执行 `npm audit`。

## 发布前验证

建议每次上线前执行：

```bash
npm run lint
npm run typecheck
npm run test
NODE_ENV=production npm run build
npm audit --audit-level=moderate
npx prisma validate
docker compose config
docker build -t auto-delivery-review:latest .
```

如果本地没有生产环境变量，执行测试和构建前先加载 `.env`：

```bash
set -a
source .env
set +a
```

## 手动验收清单

1. 在 `/admin` 登录。
2. 创建一个文件货物，例如 `cpa文件`。
3. 上传若干 `.json` 文件，确认库存总数、可用数正确。
4. 生成一张文件货物卡密，文件数量小于或等于可用库存。
5. 确认可用库存减少，预留库存增加。
6. 在 `/` 使用卡密兑换。
7. 打开兑换凭证页并下载 ZIP。
8. 确认 ZIP 中包含预期文件。
9. 再次尝试下载，确认被拒绝或跳转到已下载页面。
10. 在 `/admin/logs` 查看兑换 IP、下载 IP 和后台审计日志。
11. 创建文本货物并生成卡密，确认文本兑换页展示正确内容。

## 目录速览

```text
src/app                 Next.js App Router 页面、Server Actions 和 Route Handlers
src/components          后台、公开页和 UI 组件
src/lib                 业务服务、存储、安全、设置、分页和展示辅助逻辑
prisma                  Prisma schema 和迁移
scripts                 测试、初始化管理员、Docker 启动入口
tests                   单元测试和集成测试
storage                 本地上传文件、ZIP 和测试文件目录，默认不提交
```
