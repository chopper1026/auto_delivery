package api

import (
	"strings"
	"testing"
)

func TestGoodsListQueryUsesPreAggregatedCounts(t *testing.T) {
	query := goodsListQuery("")
	if !strings.Contains(query, "file_counts") {
		t.Fatalf("goods list query must pre-aggregate file counts: %s", query)
	}
	if strings.Contains(query, "COUNT(f.id)::int AS total") {
		t.Fatalf("goods list query must not count joined file rows directly: %s", query)
	}
}
