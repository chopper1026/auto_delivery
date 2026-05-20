package api

import (
	"strings"
	"testing"
)

func TestExpiredCardKeysWhereClauseIncludesActivePastDue(t *testing.T) {
	where := expiredCardKeysWhereClause()
	if !strings.Contains(where, "status = 'EXPIRED'") {
		t.Fatalf("expired condition should include explicit EXPIRED cards: %s", where)
	}
	if !strings.Contains(where, "status = 'ACTIVE'") || !strings.Contains(where, "expires_at < now()") {
		t.Fatalf("expired condition should include active past-due cards: %s", where)
	}
}
