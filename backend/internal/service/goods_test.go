package service

import (
	"context"
	"errors"
	"testing"

	"auto_delivery/backend/internal/domain"
)

type goodsRepositoryStub struct {
	createdInput  domain.CreateGoodsInput
	updatedID     string
	updatedStatus string
}

func (r *goodsRepositoryStub) ListGoods(context.Context, domain.ListGoodsParams) (domain.PaginatedGoodsResponse, error) {
	return domain.PaginatedGoodsResponse{}, nil
}

func (r *goodsRepositoryStub) ListCardGoodsOptions(context.Context, string, int) ([]domain.Goods, error) {
	return nil, nil
}

func (r *goodsRepositoryStub) CreateGoods(_ context.Context, input domain.CreateGoodsInput) (string, error) {
	r.createdInput = input
	return "goods-1", nil
}

func (r *goodsRepositoryStub) UpdateGoodsStatus(_ context.Context, id string, status string) error {
	r.updatedID = id
	r.updatedStatus = status
	return nil
}

func (r *goodsRepositoryStub) DeleteGoods(context.Context, string) error {
	return nil
}

func (r *goodsRepositoryStub) RegisterGoodsFiles(context.Context, string, []domain.GoodsFileUpload) error {
	return nil
}

func (r *goodsRepositoryStub) ListGoodsFileExportEntries(context.Context, string, string) ([]domain.GoodsFileExportEntry, error) {
	return nil, nil
}

func TestGoodsServiceCreateGoodsNormalizesInput(t *testing.T) {
	repo := &goodsRepositoryStub{}
	service := NewGoodsService(repo)

	id, err := service.CreateGoods(t.Context(), domain.CreateGoodsInput{
		Name:        "  CPA 文本  ",
		Type:        "text",
		TextContent: "  卡密正文  ",
		Note:        "  备注  ",
	})
	if err != nil {
		t.Fatal(err)
	}

	if id != "goods-1" {
		t.Fatalf("id = %q", id)
	}
	if repo.createdInput.Name != "CPA 文本" || repo.createdInput.Type != "TEXT" || repo.createdInput.TextContent != "卡密正文" || repo.createdInput.Note != "备注" {
		t.Fatalf("created input = %#v", repo.createdInput)
	}
}

func TestGoodsServiceCreateGoodsRejectsMissingTextContent(t *testing.T) {
	service := NewGoodsService(&goodsRepositoryStub{})

	_, err := service.CreateGoods(t.Context(), domain.CreateGoodsInput{Name: "CPA 文本", Type: "TEXT"})
	if !errors.Is(err, domain.ErrInvalidGoodsInput) {
		t.Fatalf("err = %v, want ErrInvalidGoodsInput", err)
	}
}

func TestGoodsServiceUpdateStatusNormalizesInput(t *testing.T) {
	repo := &goodsRepositoryStub{}
	service := NewGoodsService(repo)

	if err := service.UpdateGoodsStatus(t.Context(), "goods-1", " disabled "); err != nil {
		t.Fatal(err)
	}
	if repo.updatedID != "goods-1" || repo.updatedStatus != "DISABLED" {
		t.Fatalf("update = %q %q", repo.updatedID, repo.updatedStatus)
	}
}
