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

func TestGoodsListQueryUsesPreAggregatedCounts(t *testing.T) {
	query := goodsListQuery("")
	if !strings.Contains(query, "file_counts") {
		t.Fatalf("goods list query must pre-aggregate file counts: %s", query)
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
