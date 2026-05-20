package api

import (
	"net/url"
	"testing"
)

func TestParseLogsListParams(t *testing.T) {
	params, err := parseLogsListParams(url.Values{
		"type":     {"downloads"},
		"q":        {"  Safari  "},
		"page":     {"2"},
		"pageSize": {"25"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if params.Type != "downloads" || params.Query != "Safari" || params.Page != 2 || params.PageSize != 25 {
		t.Fatalf("params = %#v", params)
	}
}

func TestParseLogsListParamsRejectsInvalidType(t *testing.T) {
	_, err := parseLogsListParams(url.Values{"type": {"security"}})
	if err == nil {
		t.Fatal("expected invalid type error")
	}
}
