package api

import (
	"strings"
	"testing"
)

func TestOverviewTrendQueriesAggregateInDatabase(t *testing.T) {
	query := redemptionTrendQuery()
	if !strings.Contains(query, "GROUP BY") || !strings.Contains(query, "count(*)") {
		t.Fatalf("trend query should aggregate in database: %s", query)
	}
}
