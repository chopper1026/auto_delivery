package api

import (
	"strings"
	"testing"
	"time"
)

func TestCalculateExpiresAtSupportsConfiguredOptions(t *testing.T) {
	now := time.Date(2026, 5, 20, 10, 0, 0, 0, time.UTC)
	got, err := calculateExpiresAt("3m", now)
	if err != nil {
		t.Fatal(err)
	}
	if !got.Equal(now.Add(3 * time.Minute)) {
		t.Fatalf("3m expiration = %s", got)
	}
	got, err = calculateExpiresAt("3d", now)
	if err != nil {
		t.Fatal(err)
	}
	if !got.Equal(now.AddDate(0, 0, 3)) {
		t.Fatalf("3d expiration = %s", got)
	}
	got, err = calculateExpiresAt("never", now)
	if err != nil {
		t.Fatal(err)
	}
	if got != nil {
		t.Fatalf("never expiration = %s, want nil", got)
	}
}

func TestBuildDeliveryMessageReplacesTemplateTokens(t *testing.T) {
	created := time.Date(2026, 5, 20, 10, 30, 0, 0, time.Local)
	expires := created.AddDate(0, 0, 3)
	message := buildDeliveryMessage(settingsResponse{
		ServiceBaseURL:          "https://example.com/",
		DeliveryMessageTemplate: "卡密={{cardKey}}\n地址={{redeemUrl}}\n有效={{expiresAt}}\n创建={{createdAt}}",
	}, "AD-AAAA-BBBB-CCCC-DDDD", &expires, created)
	for _, want := range []string{"AD-AAAA-BBBB-CCCC-DDDD", "https://example.com", "2026-05-23 10:30", "2026-05-20 10:30"} {
		if !strings.Contains(message, want) {
			t.Fatalf("delivery message %q does not contain %q", message, want)
		}
	}
}

func TestBuildDeliveryMessageUsesDefaultTemplateWithRealNewlines(t *testing.T) {
	created := time.Date(2026, 5, 20, 10, 30, 0, 0, time.Local)
	message := buildDeliveryMessage(settingsResponse{
		ServiceBaseURL: "https://example.com",
	}, "AD-AAAA-BBBB-CCCC-DDDD", nil, created)
	if !strings.Contains(message, "\n卡密：AD-AAAA-BBBB-CCCC-DDDD\n") {
		t.Fatalf("message should contain real newlines, got %q", message)
	}
	if strings.Contains(message, `\n`) {
		t.Fatalf("message should not contain literal slash-n, got %q", message)
	}
}
