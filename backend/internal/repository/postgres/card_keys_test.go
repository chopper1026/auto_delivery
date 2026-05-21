package postgres

import (
	"strings"
	"testing"

	"auto_delivery/backend/internal/domain"
)

func TestBuildCardKeyListWhereSearchesGoodsNameAndMask(t *testing.T) {
	where, args := buildCardKeyListWhere(domain.ListCardKeysParams{Query: "ABCD", Status: "ACTIVE"})
	if !strings.Contains(where, "g.name ILIKE $1") || !strings.Contains(where, "c.key_mask ILIKE $1") || !strings.Contains(where, "c.status = 'ACTIVE'") || !strings.Contains(where, "c.expires_at >= now()") {
		t.Fatalf("where clause did not use expected placeholders: %s", where)
	}
	if strings.Contains(where, "ABCD") {
		t.Fatalf("where clause should not interpolate user input: %s", where)
	}
	if len(args) != 1 || args[0] != "%ABCD%" {
		t.Fatalf("args = %#v", args)
	}
}

func TestBuildCardKeyListWhereExpiredIncludesActivePastDueCards(t *testing.T) {
	where, args := buildCardKeyListWhere(domain.ListCardKeysParams{Status: "EXPIRED"})
	if !strings.Contains(where, "c.status = 'EXPIRED'") || !strings.Contains(where, "c.status = 'ACTIVE'") || !strings.Contains(where, "c.expires_at < now()") {
		t.Fatalf("expired status filter has wrong semantics: %s", where)
	}
	if len(args) != 0 {
		t.Fatalf("expired status filter should not add args, got %#v", args)
	}
}

func TestCardKeyListQueryReturnsComputedExpiredStatus(t *testing.T) {
	query := cardKeyListQuery("WHERE c.status = 'ACTIVE'", 1, 2)
	for _, want := range []string{
		"CASE",
		"c.status = 'ACTIVE'",
		"c.expires_at IS NOT NULL",
		"c.expires_at < now()",
		"THEN 'EXPIRED'",
		"ELSE c.status::text",
	} {
		if !strings.Contains(query, want) {
			t.Fatalf("card key list query missing %q:\n%s", want, query)
		}
	}
}
