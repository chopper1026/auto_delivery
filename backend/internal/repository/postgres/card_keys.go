package postgres

import "github.com/jackc/pgx/v5/pgxpool"

type CardKeysRepository struct {
	db *pgxpool.Pool
}

func NewCardKeysRepository(db *pgxpool.Pool) *CardKeysRepository {
	return &CardKeysRepository{db: db}
}
