-- +goose Up
CREATE INDEX IF NOT EXISTS idx_redemptions_redeemed_at ON redemptions(redeemed_at);
CREATE INDEX IF NOT EXISTS idx_download_logs_result_created_at ON download_logs(result, created_at);
CREATE INDEX IF NOT EXISTS idx_card_keys_status_created_at ON card_keys(status, created_at);
CREATE INDEX IF NOT EXISTS idx_goods_created_at ON goods(created_at);

-- +goose Down
DROP INDEX IF EXISTS idx_goods_created_at;
DROP INDEX IF EXISTS idx_card_keys_status_created_at;
DROP INDEX IF EXISTS idx_download_logs_result_created_at;
DROP INDEX IF EXISTS idx_redemptions_redeemed_at;
