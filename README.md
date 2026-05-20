# Auto Delivery

Auto Delivery 是一个卡密自动发货系统。用户无需登录，输入卡密后即可领取文本货物或一次性下载文件 ZIP；管理员通过后台维护货物、文件库存、卡密、系统设置和审计日志。

## 技术栈

- 前端：React `19.2.6`、Vite `8.0.13`、TypeScript `6.0.3`、React Router `7.15.1`、TanStack Query `5.100.11`
- 后端：Go `1.26.3`、Gin `1.12.0`、pgx `5.9.2`、go-redis `9.19.0`
- 数据：PostgreSQL `18.4`、Redis `8.6.3`
- 部署：单机 Docker Compose，最终应用镜像只运行 Go 二进制并托管 React 静态资源

## 本地开发

1. 安装前端依赖：

```bash
npm install
```

2. 启动 Postgres 和 Redis：

```bash
docker compose up -d postgres redis
```

3. 配置环境变量：

```bash
cp .env.example .env
```

4. 构建前端静态资源并启动 Go 服务：

```bash
npm run build
set -a && source .env && set +a
cd backend
go run ./cmd/server
```

访问地址：

- 用户兑换页：`http://localhost:3000`
- 管理后台：`http://localhost:3000/admin`

Go 服务启动时会自动执行内嵌数据库迁移，并在没有管理员时创建初始管理员。

## 常用命令

```bash
npm run dev          # Vite 前端开发服务器，/api 代理到 localhost:3000
npm run build        # 构建 React 静态资源到 frontend/dist
npm run test         # 前端单元测试
npm run typecheck    # 前端类型检查
npm run e2e          # Playwright 浏览器端到端测试

cd backend
go test ./...        # 后端单元测试
TEST_DATABASE_URL='postgresql://auto_delivery:<password>@localhost:5432/auto_delivery_test?sslmode=disable' go test ./internal/api -run Integration
go run ./cmd/server  # 启动 Go/Gin 服务
```

## Docker 部署

```bash
cp .env.example .env
# 编辑 .env，至少修改 POSTGRES_PASSWORD、ADMIN_PASSWORD、SECRET_PEPPER、APP_BASE_URL
mkdir -p data/postgres data/redis data/storage
docker compose config
docker compose up -d --build
```

生产环境建议在反向代理中启用 HTTPS，并把域名转发到：

```text
http://127.0.0.1:${APP_PORT}
```

不要直接暴露 PostgreSQL 或 Redis。

## 功能范围

- 公开兑换页和凭证页
- 文本货物展示
- 文件货物 JSON 库存上传
- 生成卡密并预留文件库存
- 文件兑换后生成 ZIP，成功下载一次后锁定
- 管理员登录、会话、CSRF 校验
- Redis 限流
- HMAC 形式的卡密/凭证/session 查询哈希
- Argon2id 管理员密码哈希
- 后台审计日志
- 系统设置和卡密交付文案模板

## 备份

至少备份以下内容：

```text
data/postgres
data/redis
data/storage
.env
```
