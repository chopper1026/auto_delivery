package postgres

import (
	"strings"
	"testing"
)

func TestAdminOverviewTrendQueriesAggregateInDatabase(t *testing.T) {
	for name, query := range map[string]string{
		"redemptions": adminRedemptionTrendQuery(),
		"downloads":   adminSuccessfulDownloadTrendQuery(),
	} {
		if !strings.Contains(query, "GROUP BY") || !strings.Contains(query, "count(*)") {
			t.Fatalf("%s trend query should aggregate in database: %s", name, query)
		}
	}
}

func TestAdminLogSearchArgsAreParameterized(t *testing.T) {
	raw, pattern := adminLogSearchArgs("Safari")
	if raw != "Safari" || pattern != "%Safari%" {
		t.Fatalf("search args = %q, %q", raw, pattern)
	}
	raw, pattern = adminLogSearchArgs("")
	if raw != "" || pattern != "%%" {
		t.Fatalf("empty search args = %q, %q", raw, pattern)
	}
}
