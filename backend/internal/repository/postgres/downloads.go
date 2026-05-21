package postgres

import "github.com/jackc/pgx/v5/pgxpool"

type DownloadsRepository struct {
	db *pgxpool.Pool
}

func NewDownloadsRepository(db *pgxpool.Pool) *DownloadsRepository {
	return &DownloadsRepository{db: db}
}
