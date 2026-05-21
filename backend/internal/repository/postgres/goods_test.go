package postgres

import (
	"strings"
	"testing"

	"auto_delivery/backend/internal/domain"
)

func TestBuildGoodsListWhereUsesParameterizedFilters(t *testing.T) {
	where, args := buildGoodsListWhere(domain.ListGoodsParams{Query: "会员", Status: "ACTIVE"})
	if !strings.Contains(where, "g.name ILIKE $1") || !strings.Contains(where, "g.status = $2") {
		t.Fatalf("where clause did not use expected placeholders: %s", where)
	}
	if strings.Contains(where, "会员") || strings.Contains(where, "ACTIVE'") {
		t.Fatalf("where clause should not interpolate user input: %s", where)
	}
	if len(args) != 2 || args[0] != "%会员%" || args[1] != "ACTIVE" {
		t.Fatalf("args = %#v", args)
	}
}

func TestGoodsListQueryAggregatesCountsOnlyForPagedGoods(t *testing.T) {
	query := goodsListQuery("")
	pagedIndex := strings.Index(query, "paged_goods AS")
	fileCountsIndex := strings.Index(query, "file_counts AS")
	if pagedIndex < 0 || fileCountsIndex < 0 || pagedIndex > fileCountsIndex {
		t.Fatalf("goods list query must page goods before aggregating counts: %s", query)
	}
	for _, want := range []string{
		"JOIN paged_goods pg ON pg.id = goods_files.goods_id",
		"JOIN paged_goods pg ON pg.id = card_keys.goods_id",
		"JOIN paged_goods pg ON pg.id = redemptions.goods_id",
		"FROM paged_goods g",
	} {
		if !strings.Contains(query, want) {
			t.Fatalf("goods list query missing %q: %s", want, query)
		}
	}
	if strings.Contains(query, "COUNT(f.id)::int AS total") {
		t.Fatalf("goods list query must not count joined file rows directly: %s", query)
	}
}

func TestCardGoodsOptionsQueryOnlyReturnsGeneratableActiveGoods(t *testing.T) {
	query := cardGoodsOptionsQuery()
	for _, want := range []string{"g.status = 'ACTIVE'", "g.type = 'TEXT'", "COALESCE(fc.available, 0) > 0"} {
		if !strings.Contains(query, want) {
			t.Fatalf("card goods options query missing %q: %s", want, query)
		}
	}
}
