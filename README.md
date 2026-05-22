# Auto Delivery

Auto Delivery 是一个卡密自动发货系统。用户无需登录即可兑换卡密，管理员在后台维护货物、文件库存、卡密、系统设置和日志。系统支持文本交付和文件 ZIP 交付，文件型卡密会在生成时预占库存，并在兑换后提供一次性下载链接。

## 当前功能

### 公开端

- `/` 卡密兑换页，支持格式化输入、粘贴清洗和兑换成功跳转。
- `/receipt/:token` 收货凭证页，展示文本货物内容或文件 ZIP 下载入口。
- `/download/already-downloaded` 一次性下载保护页，文件 ZIP 成功下载后不能再次下载。
- 公开兑换和下载接口带 Redis 限流，降低暴力尝试和重复下载压力。

### 管理后台

- `/admin/login` 管理员登录，首次启动且数据库没有管理员时自动创建初始管理员。
- `/admin` 工作台，展示卡密总数、可兑换、已兑换、已过期、今日兑换、今日下载、文件库存、卡密状态分布和交付趋势。
- `/admin/goods` 货物管理：
  - 新建文本货物或文件货物。
  - 编辑名称、备注、文本内容，启用或停用货物。
  - 按名称和状态搜索、筛选、分页。
  - 文件货物上传 JSON 库存文件，单文件最大 `5MB`，单次最多 `200` 个文件，总大小默认 `100MB`。
  - 导出未兑换或已兑换文件库存 ZIP，附带 `manifest.csv`。
  - 仅没有卡密和兑换记录的货物可删除；已有使用记录的货物应停用。
- `/admin/cards` 卡密管理：
  - 选择可用货物生成卡密。
  - 文件货物可指定交付文件数量，并在生成时预占库存。
  - 有效期选项：`3m`、`1d`、`3d`、`7d`、永不过期。
  - 生成后只展示一次完整卡密和客户交付文案；列表只保留掩码。
  - 支持按货物名称、卡密后四位和状态搜索筛选；未兑换卡密可删除。
- `/admin/logs` 日志中心：
  - 兑换日志、下载日志、后台操作日志。
  - 支持按 IP、User-Agent、动作等关键字搜索和分页。
- `/admin/settings` 系统设置：
  - 配置对外服务地址。
  - 配置卡密交付文案模板，支持 `{{redeemUrl}}`、`{{cardKey}}`、`{{createdAt}}`、`{{expiresAt}}` 变量。

### 安全和数据

- 管理员密码使用 Argon2id 哈希。
- 卡密、凭证 token、session token 使用 `SECRET_PEPPER` 参与 HMAC 查询哈希，数据库不保存明文。
- 管理后台使用 cookie session 和 CSRF token。
- Gin 中间件设置基础安全响应头，并限制管理上传请求体大小。
- 后端启动时自动执行内嵌 PostgreSQL 迁移。
- Redis 用于公开接口限流。
- 本地文件存储分为 `uploads`、`zips`、`tmp`。

## 技术栈

- 前端：React `19.2.6`、Vite `8.0.13`、TypeScript `6.0.3`、React Router `7.15.1`、TanStack Query `5.100.11`
- 后端：Go `1.26.3`、Gin `1.12.0`、pgx `5.9.2`、go-redis `9.19.0`
- 数据：PostgreSQL `18.4`、Redis `8.6.3`
- 部署：单机 Docker Compose。应用镜像使用多阶段构建，运行阶段只包含 Go 二进制、React 静态资源、CA 证书和时区数据。

## 本地开发

建议使用 Node.js `24`、npm、Go `1.26` 和 Docker Desktop / Docker Compose。

1. 安装前端依赖：

```bash
npm install
```

2. 配置环境变量：

```bash
cp .env.example .env
```

3. 启动数据库和 Redis：

```bash
npm run dev:backend:docker
```

这个命令会先启动 Docker Compose 里的 PostgreSQL 和 Redis，再读取 `.env` 运行 Go 后端。只想启动 PostgreSQL 时可以用：

```bash
npm run dev:db
```

4. 另开一个终端启动前端：

```bash
npm run dev
```

访问地址：

- 前端开发服务：`http://localhost:5173`
- 管理后台登录页：`http://localhost:5173/admin/login`
- Go API：`http://localhost:3000`
- 健康检查：`http://localhost:3000/healthz`

Go 服务启动时会自动执行数据库迁移，并在没有管理员时创建初始管理员。初始管理员来自 `.env` 中的 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD`。

## 常用命令

```bash
npm run dev                 # Vite 前端开发服务器，/api 代理到 localhost:3000
npm run dev:db              # 只启动 Docker PostgreSQL
npm run dev:backend         # 使用 .env 运行 Go/Gin 后端
npm run dev:backend:docker  # 启动 PostgreSQL/Redis 后运行 Go/Gin 后端
npm run build               # 构建 React 静态资源到 frontend/dist
npm run test                # 前端单元测试
npm run typecheck           # 前端类型检查
npm run e2e                 # Playwright 浏览器端到端测试

cd backend
go test ./...        # 后端单元测试
TEST_DATABASE_URL='postgresql://auto_delivery:<password>@localhost:5432/auto_delivery_test?sslmode=disable' go test ./internal/api -run Integration
```

完整回归命令见 [docs/verification.md](docs/verification.md)。

## 环境变量

| 变量 | 用途 |
| --- | --- |
| `POSTGRES_PASSWORD` | Docker Compose PostgreSQL 密码，生产必须替换为强随机值。 |
| `DATABASE_URL` | 本地 Go 后端连接 PostgreSQL 的地址；Docker Compose 部署时由 `docker-compose.yml` 覆盖为 `postgres` 服务地址。 |
| `POSTGRES_PORT` | PostgreSQL 暴露到宿主机的端口，默认 `15432`。 |
| `REDIS_URL` | 本地 Go 后端连接 Redis 的地址；Docker Compose 部署时由 `docker-compose.yml` 覆盖为 `redis` 服务地址。 |
| `ADMIN_USERNAME` | 初始管理员用户名，仅在数据库没有管理员时创建。 |
| `ADMIN_PASSWORD` | 初始管理员密码，至少 `12` 字符；已有管理员不会被覆盖。 |
| `SECRET_PEPPER` | token 查询哈希用的全局 pepper，至少 `32` 字符；修改后既有卡密、凭证和会话 token 会失效。 |
| `SESSION_COOKIE_NAME` | 管理后台 session cookie 名称，默认 `auto_delivery_admin`。 |
| `APP_BASE_URL` | 对外服务地址，用于生成卡密交付文案里的兑换链接。 |
| `APP_PORT` | Docker Compose 将应用发布到宿主机的端口，默认 `3000`。 |
| `HTTP_ADDR` | Go 服务监听地址，本地默认 `:3000`。 |
| `STORAGE_ROOT` | 本地文件存储根目录，Docker Compose 部署时覆盖为 `/app/storage`。 |
| `STATIC_DIR` | React 静态资源目录，Docker Compose 部署时覆盖为 `/app/public`。 |
| `ADMIN_UPLOAD_BODY_LIMIT_BYTES` | 管理上传请求体上限，默认 `104857600`。当前 Compose 文件未显式传入该变量，如需生产调整可加到 `app.environment`。 |
| `TZ` | 应用和数据库时区，默认 `Asia/Shanghai`。 |

后端还支持 `TRUSTED_PROXY_CIDRS`、`FORCE_SECURE_COOKIES`、`SESSION_TTL`、`DOWNLOAD_CLAIM_TTL` 等配置；Docker Compose 部署如需启用，也需要加入 `app.environment`。

## Docker 部署

```bash
cp .env.example .env
# 编辑 .env，至少修改 POSTGRES_PASSWORD、ADMIN_PASSWORD、SECRET_PEPPER、APP_BASE_URL
mkdir -p data/postgres data/redis data/storage
docker compose config
docker compose up -d --build
```

部署后检查：

```bash
docker compose ps
docker compose logs -f app
curl http://127.0.0.1:${APP_PORT:-3000}/healthz
```

生产环境建议在反向代理中启用 HTTPS，并把域名转发到：

```text
http://127.0.0.1:${APP_PORT}
```

不要直接暴露 PostgreSQL 或 Redis。当前 `docker-compose.yml` 会把 PostgreSQL 绑定到宿主机 `${POSTGRES_PORT:-15432}:5432`，生产环境建议用防火墙限制访问，或改成只监听 `127.0.0.1`。

## 数据和备份

Docker Compose 使用项目目录下的绑定挂载保存数据：

```text
data/postgres  # PostgreSQL 数据
data/redis     # Redis AOF 数据
data/storage   # 上传文件、兑换 ZIP、临时文件
.env           # 生产密钥和部署配置
```

至少备份以上路径。`SECRET_PEPPER` 必须和数据库一起保存；如果丢失或替换，历史卡密、收货凭证和管理员会话将无法按原 token 查询。
