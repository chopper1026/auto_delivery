# Auto Delivery

卡密自动发货系统。用户无需登录，输入卡密后领取文本货物或一次性下载文件 ZIP；管理员在后台管理货物、卡密和日志。

## Local Setup

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Edit `.env` and set strong values:

```env
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="replace-with-a-long-password"
SECRET_PEPPER="replace-with-at-least-32-random-bytes"
```

3. Start PostgreSQL:

```bash
docker compose up -d postgres postgres-test
```

4. Generate Prisma Client and apply migrations:

```bash
npx prisma generate
npx prisma migrate dev
DATABASE_URL="postgresql://auto_delivery:auto_delivery@localhost:5433/auto_delivery_test?schema=public" npx prisma migrate deploy
```

5. Create the first administrator:

```bash
npm run init:admin
```

6. Start development server:

```bash
npm run dev
```

Public page: `http://localhost:3000`

Admin page: `http://localhost:3000/admin`

## Daily Commands

```bash
npm run test
npm run lint
npm run build
```

## Manual V1 Checklist

1. Log in at `/admin`.
2. Create file goods named `cpa文件`.
3. Upload 100 `.json` files.
4. Confirm inventory shows total `100` and available `100`.
5. Generate one card key with file quantity `10` and expiration `3天`.
6. Confirm available inventory changes to `90` and reserved inventory changes to `10`.
7. Redeem the card key from `/`.
8. Open the receipt page and download the ZIP once.
9. Confirm the ZIP contains 10 files.
10. Try downloading again and confirm the second attempt is rejected.
11. Check `/admin/logs` for redemption IP and download IP.

## Production Notes

- Keep `.env` out of Git.
- Use a long random `SECRET_PEPPER`; changing it invalidates existing card-key and receipt-token hashes.
- Use HTTPS in production so secure cookies work correctly.
- Back up PostgreSQL volume and `app-data` volume together.
- Do not manually delete generated ZIP files unless the corresponding database records are intentionally archived.
- Initial storage is local disk through Docker volumes. Move to object storage only when file size or migration needs justify it.
