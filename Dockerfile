FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
ENV DATABASE_URL="postgresql://auto_delivery:auto_delivery@postgres:5432/auto_delivery?schema=public"
ENV ADMIN_USERNAME="admin"
ENV ADMIN_PASSWORD="build-time-password"
ENV SECRET_PEPPER="build-time-secret-pepper-at-least-32-bytes"
ENV SESSION_COOKIE_NAME="auto_delivery_admin"
ENV APP_BASE_URL="http://localhost:3000"
ENV STORAGE_ROOT="./storage"
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
RUN mkdir -p /app/storage/uploads /app/storage/zips /app/storage/tmp
EXPOSE 3000
CMD ["npm", "run", "start"]
