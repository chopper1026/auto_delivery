package service

import (
	"testing"
	"time"
)

func TestCalculateExpiresAtSupportsConfiguredOptions(t *testing.T) {
	now := time.Date(2026, 5, 20, 10, 0, 0, 0, time.UTC)
	got, err := CalculateExpiresAt(" 3M ", now)
	if err != nil {
		t.Fatal(err)
	}
	if got == nil || !got.Equal(now.Add(3*time.Minute)) {
		t.Fatalf("3m expiration = %v", got)
	}
	got, err = CalculateExpiresAt("", now)
	if err != nil {
		t.Fatal(err)
	}
	if got == nil || !got.Equal(now.AddDate(0, 0, 3)) {
		t.Fatalf("default expiration = %v", got)
	}
	got, err = CalculateExpiresAt("never", now)
	if err != nil {
		t.Fatal(err)
	}
	if got != nil {
		t.Fatalf("never expiration = %s, want nil", got)
	}
}
