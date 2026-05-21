-- +goose Up
CREATE INDEX IF NOT EXISTS idx_goods_status_created_at ON goods(status, created_at DESC);

-- +goose Down
DROP INDEX IF EXISTS idx_goods_status_created_at;
