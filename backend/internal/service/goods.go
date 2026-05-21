package service

import (
	"context"
	"strings"

	"auto_delivery/backend/internal/domain"
)

type GoodsRepository interface {
	ListGoods(context.Context, domain.ListGoodsParams) (domain.PaginatedGoodsResponse, error)
	ListCardGoodsOptions(context.Context, string, int) ([]domain.Goods, error)
	CreateGoods(context.Context, domain.CreateGoodsInput) (string, error)
	UpdateGoodsStatus(context.Context, string, string) error
	DeleteGoods(context.Context, string) error
	RegisterGoodsFiles(context.Context, string, []domain.GoodsFileUpload) error
	ListGoodsFileExportEntries(context.Context, string, string) ([]domain.GoodsFileExportEntry, error)
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

func (s *GoodsService) CreateGoods(ctx context.Context, input domain.CreateGoodsInput) (string, error) {
	normalized, err := normalizeCreateGoodsInput(input)
	if err != nil {
		return "", err
	}
	return s.repository.CreateGoods(ctx, normalized)
}

func (s *GoodsService) UpdateGoodsStatus(ctx context.Context, id string, status string) error {
	normalized := strings.ToUpper(strings.TrimSpace(status))
	if normalized != "ACTIVE" && normalized != "DISABLED" {
		return domain.ErrInvalidGoodsInput
	}
	return s.repository.UpdateGoodsStatus(ctx, id, normalized)
}

func (s *GoodsService) DeleteGoods(ctx context.Context, id string) error {
	return s.repository.DeleteGoods(ctx, id)
}

func (s *GoodsService) RegisterGoodsFiles(ctx context.Context, goodsID string, files []domain.GoodsFileUpload) error {
	if len(files) == 0 {
		return domain.ErrInvalidGoodsInput
	}
	return s.repository.RegisterGoodsFiles(ctx, goodsID, files)
}

func (s *GoodsService) ListGoodsFileExportEntries(ctx context.Context, goodsID string, scope string) ([]domain.GoodsFileExportEntry, error) {
	normalized := strings.ToUpper(strings.TrimSpace(scope))
	if normalized != "UNREDEEMED" && normalized != "REDEEMED" {
		return nil, domain.ErrInvalidGoodsInput
	}
	return s.repository.ListGoodsFileExportEntries(ctx, goodsID, normalized)
}

func normalizeCreateGoodsInput(input domain.CreateGoodsInput) (domain.CreateGoodsInput, error) {
	normalized := domain.CreateGoodsInput{
		Name:        strings.TrimSpace(input.Name),
		Type:        strings.ToUpper(strings.TrimSpace(input.Type)),
		TextContent: strings.TrimSpace(input.TextContent),
		Note:        strings.TrimSpace(input.Note),
	}
	if normalized.Name == "" {
		return domain.CreateGoodsInput{}, domain.ErrInvalidGoodsInput
	}
	if normalized.Type != "TEXT" && normalized.Type != "FILE" {
		return domain.CreateGoodsInput{}, domain.ErrInvalidGoodsInput
	}
	if normalized.Type == "TEXT" && normalized.TextContent == "" {
		return domain.CreateGoodsInput{}, domain.ErrInvalidGoodsInput
	}
	return normalized, nil
}
