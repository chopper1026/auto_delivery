package api

import (
	"net/http"
	"testing"

	"auto_delivery/backend/internal/testutil"
)

func TestSettingsValidationIntegration(t *testing.T) {
	pool := testutil.OpenTestDB(t)
	defer pool.Close()
	app := newIntegrationApp(t, pool)
	cookie, csrf := loginIntegrationAdmin(t, app)

	invalid := performJSONRequest(t, app, http.MethodPatch, "/api/admin/settings", cookie, csrf, `{"serviceBaseUrl":"ftp://example.com"}`)
	if invalid.Code != http.StatusBadRequest {
		t.Fatalf("invalid settings status = %d, body = %s", invalid.Code, invalid.Body.String())
	}
	var invalidPayload struct {
		Error string `json:"error"`
	}
	invalidPayload = decodeResponse[struct {
		Error string `json:"error"`
	}](t, invalid)
	if invalidPayload.Error != "服务地址必须使用 http 或 https。" {
		t.Fatalf("invalid settings error = %q", invalidPayload.Error)
	}

	valid := performJSONRequest(t, app, http.MethodPatch, "/api/admin/settings", cookie, csrf, `{"serviceBaseUrl":"https://delivery.example.com/base/","deliveryMessageTemplate":"卡密：{{cardKey}}"}`)
	if valid.Code != http.StatusOK {
		t.Fatalf("valid settings status = %d, body = %s", valid.Code, valid.Body.String())
	}
	var payload struct {
		ServiceBaseURL          string `json:"serviceBaseUrl"`
		DeliveryMessageTemplate string `json:"deliveryMessageTemplate"`
	}
	payload = decodeResponse[struct {
		ServiceBaseURL          string `json:"serviceBaseUrl"`
		DeliveryMessageTemplate string `json:"deliveryMessageTemplate"`
	}](t, valid)
	if payload.ServiceBaseURL != "https://delivery.example.com/base" || payload.DeliveryMessageTemplate != "卡密：{{cardKey}}" {
		t.Fatalf("settings payload = %#v", payload)
	}
}
