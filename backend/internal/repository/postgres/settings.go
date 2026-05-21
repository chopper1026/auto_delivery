package postgres

import (
	"context"

	"auto_delivery/backend/internal/domain"

	"github.com/jackc/pgx/v5/pgxpool"
)

type SettingsRepository struct {
	db *pgxpool.Pool
}

func NewSettingsRepository(db *pgxpool.Pool) *SettingsRepository {
	return &SettingsRepository{db: db}
}

func (r *SettingsRepository) LoadSettings(ctx context.Context, defaults domain.Settings) (domain.Settings, error) {
	rows, err := r.db.Query(ctx, `SELECT key, value FROM system_settings`)
	if err != nil {
		return domain.Settings{}, err
	}
	defer rows.Close()

	out := defaults
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			return domain.Settings{}, err
		}
		switch key {
		case "service_base_url":
			out.ServiceBaseURL = value
		case "card_key_delivery_message_template":
			out.DeliveryMessageTemplate = value
		}
	}
	return out, rows.Err()
}

func (r *SettingsRepository) UpsertSetting(ctx context.Context, key string, value string) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO system_settings (key, value) VALUES ($1, $2)
		ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
	`, key, value)
	return err
}
