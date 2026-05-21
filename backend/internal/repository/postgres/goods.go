package postgres

import "github.com/jackc/pgx/v5/pgxpool"

type GoodsRepository struct {
	db *pgxpool.Pool
}

func NewGoodsRepository(db *pgxpool.Pool) *GoodsRepository {
	return &GoodsRepository{db: db}
}
