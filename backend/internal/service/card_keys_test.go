package service

import (
	"context"
	"strings"
	"testing"
	"time"

	"auto_delivery/backend/internal/domain"
)

type cardKeysRepositoryStub struct {
	createInput domain.CreateCardKeyInput
}

type settingsRepositoryStub struct {
	settings domain.Settings
}

func (r *settingsRepositoryStub) LoadSettings(context.Context, domain.Settings) (domain.Settings, error) {
	return r.settings, nil
}

func (r *settingsRepositoryStub) UpsertSetting(context.Context, string, string) error {
	return nil
}

func (r *cardKeysRepositoryStub) ListCardKeys(context.Context, domain.ListCardKeysParams) (domain.PaginatedCardKeysResponse, error) {
	return domain.PaginatedCardKeysResponse{}, nil
}

func (r *cardKeysRepositoryStub) CreateCardKey(_ context.Context, input domain.CreateCardKeyInput) (domain.GeneratedCardKey, error) {
	r.createInput = input
	return domain.GeneratedCardKey{
		ID:        "card-1",
		KeyMask:   input.KeyMask,
		ExpiresAt: input.ExpiresAt,
		CreatedAt: time.Date(2026, 5, 21, 10, 30, 0, 0, time.UTC),
	}, nil
}

func (r *cardKeysRepositoryStub) DeleteCardKey(context.Context, string) error {
	return nil
}

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

func TestCardKeysServiceGenerateCardKeyCreatesHashedKeyAndDeliveryMessage(t *testing.T) {
	repo := &cardKeysRepositoryStub{}
	settings := NewSettingsService(&settingsRepositoryStub{
		settings: domain.Settings{
			ServiceBaseURL:          "https://delivery.example.com/base",
			DeliveryMessageTemplate: "卡密={{cardKey}}\n地址={{redeemUrl}}\n有效={{expiresAt}}",
		},
	})
	service := NewCardKeysService(repo, "pepper", settings, "https://delivery.example.com")

	result, err := service.GenerateCardKey(t.Context(), domain.GenerateCardKeyInput{
		GoodsID:    "goods-1",
		Expiration: "never",
	})
	if err != nil {
		t.Fatal(err)
	}

	if result.ID != "card-1" || result.PlaintextKey == "" || result.KeyMask == "" {
		t.Fatalf("result = %#v", result)
	}
	if repo.createInput.GoodsID != "goods-1" || repo.createInput.KeyHash == "" || repo.createInput.KeyHash == result.PlaintextKey {
		t.Fatalf("create input = %#v", repo.createInput)
	}
	if repo.createInput.KeyMask != result.KeyMask {
		t.Fatalf("key mask mismatch: input=%q result=%q", repo.createInput.KeyMask, result.KeyMask)
	}
	for _, want := range []string{result.PlaintextKey, "https://delivery.example.com/base", "永不过期"} {
		if !strings.Contains(result.DeliveryMessage, want) {
			t.Fatalf("delivery message %q missing %q", result.DeliveryMessage, want)
		}
	}
}
