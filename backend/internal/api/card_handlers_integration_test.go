package api

import (
	"net/url"
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
