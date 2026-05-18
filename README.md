# Auto Delivery

卡密自动发货系统。用户无需登录，输入卡密后领取文本货物或一次性下载文件 ZIP；管理员在后台管理货物、卡密和日志。

## 本地启动

1. 复制环境变量模板：

```bash
cp .env.example .env
```

2. 编辑 `.env`，把下面这些值改成更安全的配置：

```env
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="replace-with-a-long-password"
SECRET_PEPPER="replace-with-at-least-32-random-bytes"
```

3. 启动 PostgreSQL：

```bash
docker compose up -d postgres
```

4. 生成 Prisma Client，并执行数据库迁移：

```bash
npx prisma generate
npx prisma migrate dev
```

5. 创建第一个管理员：

```bash
npm run init:admin
```

6. 启动开发服务器：

```bash
npm run dev
```

用户页面：`http://localhost:3000`

管理后台：`http://localhost:3000/admin`

## 常用命令

```bash
npm run test
npm run lint
npm run build
```

## V1 手动验收清单

1. 在 `/admin` 登录。
2. 创建一个名为 `cpa文件` 的文件类货物。
3. 上传 100 个 `.json` 文件。
4. 确认库存显示总数 `100`、可用 `100`。
5. 生成一张卡密，文件数量为 `10`，有效期为 `3天`。
6. 确认可用库存变为 `90`，预留库存变为 `10`。
7. 在 `/` 使用这张卡密兑换。
8. 打开兑换凭证页面，并下载一次 ZIP。
9. 确认 ZIP 中包含 10 个文件。
10. 再次尝试下载，确认第二次下载被拒绝。
11. 在 `/admin/logs` 查看兑换 IP 和下载 IP。

## 生产环境注意事项

- 不要把 `.env` 提交到 Git。
- 使用足够长的随机 `SECRET_PEPPER`；修改它会导致已有卡密和兑换凭证 token 的哈希失效。
- 生产环境使用 HTTPS，确保安全 Cookie 正常工作。
- PostgreSQL 数据卷和 `app-data` 数据卷需要一起备份。
- 不要手动删除已生成的 ZIP 文件，除非对应的数据库记录也已按预期归档。
- 初始版本通过 Docker volume 使用本地磁盘存储；只有在文件规模或迁移需求确实需要时，再迁移到对象存储。
