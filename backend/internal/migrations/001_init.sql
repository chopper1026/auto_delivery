-- +goose Up
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN CREATE TYPE goods_type AS ENUM ('TEXT', 'FILE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE goods_status AS ENUM ('ACTIVE', 'DISABLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE goods_file_status AS ENUM ('AVAILABLE', 'RESERVED', 'REDEEMED', 'DELETED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE card_key_status AS ENUM ('ACTIVE', 'REDEEMED', 'EXPIRED', 'DELETED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE download_result AS ENUM ('SUCCESS', 'ALREADY_DOWNLOADED', 'NOT_FOUND', 'ERROR'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE redemption_download_state AS ENUM ('AVAILABLE', 'IN_PROGRESS', 'DOWNLOADED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  csrf_token_hash text NOT NULL,
  admin_user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  ip_address text NOT NULL,
  user_agent text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_user_id ON admin_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);

CREATE TABLE IF NOT EXISTS goods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type goods_type NOT NULL,
  text_content text,
  note text,
  status goods_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_goods_type_status ON goods(type, status);

CREATE TABLE IF NOT EXISTS card_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash text NOT NULL UNIQUE,
  key_mask text NOT NULL,
  goods_id uuid NOT NULL REFERENCES goods(id) ON DELETE RESTRICT,
  goods_type goods_type NOT NULL,
  file_quantity integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  status card_key_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  redeemed_at timestamptz,
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_card_keys_goods_id_status ON card_keys(goods_id, status);
CREATE INDEX IF NOT EXISTS idx_card_keys_expires_at ON card_keys(expires_at);

CREATE TABLE IF NOT EXISTS goods_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_id uuid NOT NULL REFERENCES goods(id) ON DELETE CASCADE,
  original_name text NOT NULL,
  stored_name text NOT NULL,
  storage_path text NOT NULL,
  size_bytes bigint NOT NULL,
  mime_type text NOT NULL,
  sha256 text NOT NULL,
  status goods_file_status NOT NULL DEFAULT 'AVAILABLE',
  reserved_by_card_key_id uuid REFERENCES card_keys(id) ON DELETE SET NULL,
  redeemed_by_redemption_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  reserved_at timestamptz,
  redeemed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_goods_files_goods_id_status ON goods_files(goods_id, status);
CREATE INDEX IF NOT EXISTS idx_goods_files_reserved_by_card_key_id ON goods_files(reserved_by_card_key_id);
CREATE INDEX IF NOT EXISTS idx_goods_files_redeemed_by_redemption_id ON goods_files(redeemed_by_redemption_id);

CREATE TABLE IF NOT EXISTS redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_key_id uuid NOT NULL UNIQUE REFERENCES card_keys(id) ON DELETE RESTRICT,
  goods_id uuid NOT NULL REFERENCES goods(id) ON DELETE RESTRICT,
  receipt_token_hash text NOT NULL UNIQUE,
  receipt_token_mask text NOT NULL,
  ip_address text NOT NULL,
  user_agent text NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  zip_path text,
  zip_size_bytes bigint,
  download_count integer NOT NULL DEFAULT 0,
  download_state redemption_download_state NOT NULL DEFAULT 'AVAILABLE',
  download_claim_token_hash text,
  download_claim_expires_at timestamptz,
  first_downloaded_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_redemptions_goods_id_redeemed_at ON redemptions(goods_id, redeemed_at);
CREATE INDEX IF NOT EXISTS idx_redemptions_download_state_claim ON redemptions(download_state, download_claim_expires_at);
ALTER TABLE goods_files
  ADD CONSTRAINT fk_goods_files_redeemed_by_redemption
  FOREIGN KEY (redeemed_by_redemption_id) REFERENCES redemptions(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS redemption_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  redemption_id uuid NOT NULL REFERENCES redemptions(id) ON DELETE CASCADE,
  goods_file_id uuid NOT NULL REFERENCES goods_files(id) ON DELETE RESTRICT,
  original_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (redemption_id, goods_file_id)
);
CREATE INDEX IF NOT EXISTS idx_redemption_files_goods_file_id ON redemption_files(goods_file_id);

CREATE TABLE IF NOT EXISTS download_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  redemption_id uuid REFERENCES redemptions(id) ON DELETE SET NULL,
  receipt_token_hash text,
  ip_address text NOT NULL,
  user_agent text NOT NULL,
  result download_result NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_download_logs_redemption_id_created_at ON download_logs(redemption_id, created_at);
CREATE INDEX IF NOT EXISTS idx_download_logs_receipt_token_hash ON download_logs(receipt_token_hash);
CREATE INDEX IF NOT EXISTS idx_download_logs_created_at ON download_logs(created_at);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  ip_address text NOT NULL,
  user_agent text NOT NULL,
  metadata_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_user_id_created_at ON admin_audit_logs(admin_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_entity ON admin_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at);

CREATE TABLE IF NOT EXISTS system_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO system_settings (key, value)
VALUES
  ('card_key_delivery_message_template', E'兑换地址：{{redeemUrl}}\n卡密：{{cardKey}}\n创建时间：{{createdAt}}\n到期时间：{{expiresAt}}\n\n注意事项：\n1. 一个卡密只能兑换一次，请勿转发给无关人员。\n2. 兑换完成后请及时保存收货页面内容或下载文件。\n3. 因个人原因未及时保存导致的损失不予处理。')
ON CONFLICT (key) DO NOTHING;

-- +goose Down
DROP TABLE IF EXISTS system_settings;
DROP TABLE IF EXISTS admin_audit_logs;
DROP TABLE IF EXISTS download_logs;
DROP TABLE IF EXISTS redemption_files;
ALTER TABLE IF EXISTS goods_files DROP CONSTRAINT IF EXISTS fk_goods_files_redeemed_by_redemption;
DROP TABLE IF EXISTS redemptions;
DROP TABLE IF EXISTS goods_files;
DROP TABLE IF EXISTS card_keys;
DROP TABLE IF EXISTS goods;
DROP TABLE IF EXISTS admin_sessions;
DROP TABLE IF EXISTS admin_users;
DROP TYPE IF EXISTS redemption_download_state;
DROP TYPE IF EXISTS download_result;
DROP TYPE IF EXISTS card_key_status;
DROP TYPE IF EXISTS goods_file_status;
DROP TYPE IF EXISTS goods_status;
DROP TYPE IF EXISTS goods_type;
