FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:24-alpine AS migrate-deps
WORKDIR /migrate
RUN printf '%s\n' '{"private":true,"dependencies":{"prisma":"7.8.0"},"overrides":{"@prisma/dev":{"@hono/node-server":"1.19.13"}}}' > package.json \
  && npm install --omit=dev --ignore-scripts --no-audit --no-fund \
  && rm -rf \
    node_modules/@electric-sql \
    node_modules/@hono \
    node_modules/@img \
    node_modules/@kurkle \
    node_modules/aws-ssl-profiles \
    node_modules/chart.js \
    node_modules/hono \
    node_modules/mysql2 \
    node_modules/sharp

FROM node:24-alpine AS builder
WORKDIR /app
ENV DATABASE_URL="postgresql://auto_delivery:auto_delivery@postgres:5432/auto_delivery?schema=public"
ENV ADMIN_USERNAME="admin"
ENV SESSION_COOKIE_NAME="auto_delivery_admin"
ENV APP_BASE_URL="http://localhost:3000"
ENV STORAGE_ROOT="./storage"
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN ADMIN_PASSWORD="build-time-password" SECRET_PEPPER="build-time-secret-pepper-at-least-32-bytes" npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --chown=node:node --from=migrate-deps /migrate/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/.next/standalone ./
COPY --chown=node:node --from=builder /app/.next/static ./.next/static
COPY --chown=node:node --from=builder /app/public ./public
COPY --chown=node:node --from=builder /app/prisma ./prisma
COPY --chown=node:node --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --chown=node:node --from=builder /app/scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
COPY --chown=node:node --from=builder /app/scripts/init-admin-runtime.mjs ./scripts/init-admin-runtime.mjs
RUN chmod +x /app/scripts/docker-entrypoint.sh \
  && mkdir -p /app/storage/uploads /app/storage/zips /app/storage/tmp \
  && chown -R node:node /app/storage /app/.next
USER node
EXPOSE 3000
CMD ["./scripts/docker-entrypoint.sh"]
