package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"auto_delivery/backend/internal/domain"
	"auto_delivery/backend/internal/security"
)

type CardKeysRepository interface {
	ListCardKeys(context.Context, domain.ListCardKeysParams) (domain.PaginatedCardKeysResponse, error)
	CreateCardKey(context.Context, domain.CreateCardKeyInput) (domain.GeneratedCardKey, error)
	DeleteCardKey(context.Context, string) error
}

var ErrInvalidExpiration = errors.New("invalid expiration")

type CardKeysService struct {
	repository   CardKeysRepository
	secretPepper string
	settings     *SettingsService
	appBaseURL   string
}

func NewCardKeysService(repository CardKeysRepository, secretPepper string, settings *SettingsService, appBaseURL string) *CardKeysService {
	return &CardKeysService{repository: repository, secretPepper: secretPepper, settings: settings, appBaseURL: appBaseURL}
}

func (s *CardKeysService) ListCardKeys(ctx context.Context, params domain.ListCardKeysParams) (domain.PaginatedCardKeysResponse, error) {
	return s.repository.ListCardKeys(ctx, params)
}

func (s *CardKeysService) GenerateCardKey(ctx context.Context, input domain.GenerateCardKeyInput) (domain.GeneratedCardKey, error) {
	expiration := strings.ToLower(strings.TrimSpace(input.Expiration))
	if expiration == "" {
		expiration = "3d"
	}
	expiresAt, err := CalculateExpiresAt(expiration, time.Now())
	if err != nil {
		return domain.GeneratedCardKey{}, err
	}
	plaintext, err := security.GenerateCardKey()
	if err != nil {
		return domain.GeneratedCardKey{}, err
	}
	created, err := s.repository.CreateCardKey(ctx, domain.CreateCardKeyInput{
		GoodsID:      strings.TrimSpace(input.GoodsID),
		KeyHash:      security.LookupHash(plaintext, s.secretPepper),
		KeyMask:      security.MaskSecret(plaintext),
		FileQuantity: input.FileQuantity,
		ExpiresAt:    expiresAt,
	})
	if err != nil {
		return domain.GeneratedCardKey{}, err
	}
	settings := domain.Settings{
		ServiceBaseURL:          s.appBaseURL,
		DeliveryMessageTemplate: DefaultDeliveryMessageTemplate,
	}
	if s.settings != nil {
		if loaded, err := s.settings.Load(ctx, s.appBaseURL); err == nil {
			settings = loaded
		}
	}
	created.PlaintextKey = plaintext
	created.DeliveryMessage = BuildDeliveryMessage(settings, plaintext, created.ExpiresAt, created.CreatedAt)
	return created, nil
}

func (s *CardKeysService) DeleteCardKey(ctx context.Context, id string) error {
	return s.repository.DeleteCardKey(ctx, id)
}

func CalculateExpiresAt(option string, now time.Time) (*time.Time, error) {
	var expires time.Time
	switch strings.ToLower(strings.TrimSpace(option)) {
	case "", "3d":
		expires = now.AddDate(0, 0, 3)
	case "never":
		return nil, nil
	case "3m":
		expires = now.Add(3 * time.Minute)
	case "1d":
		expires = now.AddDate(0, 0, 1)
	case "7d":
		expires = now.AddDate(0, 0, 7)
	default:
		return nil, ErrInvalidExpiration
	}
	return &expires, nil
}

func BuildDeliveryMessage(settings domain.Settings, cardKey string, expiresAt *time.Time, createdAt time.Time) string {
	template := settings.DeliveryMessageTemplate
	if template == "" {
		template = DefaultDeliveryMessageTemplate
	}
	expires := "永不过期"
	if expiresAt != nil {
		expires = expiresAt.Format("2006-01-02 15:04")
	}
	replacer := strings.NewReplacer(
		"{{cardKey}}", cardKey,
		"{{redeemUrl}}", strings.TrimRight(settings.ServiceBaseURL, "/"),
		"{{expiresAt}}", expires,
		"{{createdAt}}", createdAt.Format("2006-01-02 15:04"),
	)
	return replacer.Replace(template)
}
