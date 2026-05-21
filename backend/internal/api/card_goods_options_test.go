package api

import (
	"strings"
	"testing"
)

func TestCardGoodsOptionsQueryOnlyReturnsGeneratableActiveGoods(t *testing.T) {
	query := cardGoodsOptionsQuery()
	for _, want := range []string{"g.status = 'ACTIVE'", "g.type = 'TEXT'", "COALESCE(fc.available, 0) > 0"} {
		if !strings.Contains(query, want) {
			t.Fatalf("card goods options query missing %q: %s", want, query)
		}
	}
}
