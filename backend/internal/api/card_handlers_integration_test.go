package api

import (
	"net/url"
	"strings"
	"testing"
)

func TestParseCardKeyListParams(t *testing.T) {
	params, err := parseCardKeyListParams(url.Values{
		"q":        {"  1234  "},
		"status":   {"redeemed"},
		"page":     {"3"},
		"pageSize": {"25"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if params.Query != "1234" || params.Status != "REDEEMED" || params.Page != 3 || params.PageSize != 25 {
		t.Fatalf("params = %#v", params)
	}
}

func TestParseCardKeyListParamsRejectsInvalidStatus(t *testing.T) {
	_, err := parseCardKeyListParams(url.Values{"status": {"DISABLED"}})
	if err == nil {
		t.Fatal("expected invalid status error")
	}
}

func TestBuildCardKeyListWhereSearchesGoodsNameAndMask(t *testing.T) {
	where, args := buildCardKeyListWhere(cardKeyListParams{Query: "ABCD", Status: "ACTIVE"})
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
	where, args := buildCardKeyListWhere(cardKeyListParams{Status: "EXPIRED"})
	if !strings.Contains(where, "c.status = 'EXPIRED'") || !strings.Contains(where, "c.status = 'ACTIVE'") || !strings.Contains(where, "c.expires_at < now()") {
		t.Fatalf("expired status filter has wrong semantics: %s", where)
	}
	if len(args) != 0 {
		t.Fatalf("expired status filter should not add args, got %#v", args)
	}
}
