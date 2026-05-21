package service

import (
	"context"

	"auto_delivery/backend/internal/domain"
)

type GoodsRepository interface {
	ListGoods(context.Context, domain.ListGoodsParams) (domain.PaginatedGoodsResponse, error)
	ListCardGoodsOptions(context.Context, string, int) ([]domain.Goods, error)
}

type GoodsService struct {
	repository GoodsRepository
}

func NewGoodsService(repository GoodsRepository) *GoodsService {
	return &GoodsService{repository: repository}
}

func (s *GoodsService) ListGoods(ctx context.Context, params domain.ListGoodsParams) (domain.PaginatedGoodsResponse, error) {
	return s.repository.ListGoods(ctx, params)
}

func (s *GoodsService) ListCardGoodsOptions(ctx context.Context, query string, limit int) ([]domain.Goods, error) {
	return s.repository.ListCardGoodsOptions(ctx, query, limit)
}
