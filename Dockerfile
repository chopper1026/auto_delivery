FROM node:24.15.0-alpine AS frontend
WORKDIR /src
COPY package*.json ./
RUN npm ci
COPY index.html tsconfig.json vite.config.ts vitest.config.ts ./
COPY frontend ./frontend
RUN npm run build

FROM golang:1.26.3-alpine AS backend
WORKDIR /src/backend
RUN apk add --no-cache git
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend ./
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/auto-delivery ./cmd/server

FROM alpine:3.22
WORKDIR /app
RUN apk add --no-cache ca-certificates tzdata \
  && addgroup -S app \
  && adduser -S app -G app \
  && mkdir -p /app/storage/uploads /app/storage/zips /app/storage/tmp \
  && chown -R app:app /app
COPY --from=backend /out/auto-delivery /app/auto-delivery
COPY --from=frontend /src/frontend/dist /app/public
ENV APP_ENV=production \
  HTTP_ADDR=:3000 \
  STATIC_DIR=/app/public \
  STORAGE_ROOT=/app/storage \
  TZ=Asia/Shanghai
USER app
EXPOSE 3000
CMD ["/app/auto-delivery"]
