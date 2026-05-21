package service

import (
	"context"
	"errors"
	"net/url"
	"strings"

	"auto_delivery/backend/internal/domain"
)

const DefaultDeliveryMessageTemplate = "卡密：{{cardKey}}\n兑换地址：{{redeemUrl}}\n创建时间：{{createdAt}}\n过期时间：{{expiresAt}}\n\n注意事项：卡密仅可兑换一次，请在有效期内及时兑换，兑换后立刻保存，过期或自身未保存导致的损失自负。"

type SettingsRepository interface {
	LoadSettings(context.Context, domain.Settings) (domain.Settings, error)
	UpsertSetting(context.Context, string, string) error
}

type SettingsService struct {
	repository SettingsRepository
}

func NewSettingsService(repository SettingsRepository) *SettingsService {
	return &SettingsService{repository: repository}
}

func NormalizeServiceBaseURL(value string) (string, error) {
	trimmed := strings.TrimSpace(value)
	parsed, err := url.Parse(trimmed)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return "", errors.New("service address must be a valid URL")
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return "", errors.New("service address must use http or https")
	}
	parsed.RawQuery = ""
	parsed.Fragment = ""
	parsed.Path = strings.TrimRight(parsed.Path, "/")
	return parsed.String(), nil
}

func (s *SettingsService) Load(ctx context.Context, appBaseURL string) (domain.Settings, error) {
	return s.repository.LoadSettings(ctx, domain.Settings{
		ServiceBaseURL:          appBaseURL,
		DeliveryMessageTemplate: DefaultDeliveryMessageTemplate,
	})
}

func (s *SettingsService) Update(ctx context.Context, appBaseURL string, input domain.SettingsUpdate) (domain.Settings, error) {
	if input.ServiceBaseURL != nil {
		serviceBaseURL, err := NormalizeServiceBaseURL(*input.ServiceBaseURL)
		if err != nil {
			return domain.Settings{}, err
		}
		if err := s.repository.UpsertSetting(ctx, "service_base_url", serviceBaseURL); err != nil {
			return domain.Settings{}, err
		}
	}
	if input.DeliveryMessageTemplate != nil {
		deliveryMessage := *input.DeliveryMessageTemplate
		if strings.TrimSpace(deliveryMessage) == "" {
			deliveryMessage = DefaultDeliveryMessageTemplate
		}
		if err := s.repository.UpsertSetting(ctx, "card_key_delivery_message_template", deliveryMessage); err != nil {
			return domain.Settings{}, err
		}
	}
	return s.Load(ctx, appBaseURL)
}
