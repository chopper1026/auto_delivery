package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"auto_delivery/backend/internal/domain"
)

type CardKeysRepository interface {
	ListCardKeys(context.Context, domain.ListCardKeysParams) (domain.PaginatedCardKeysResponse, error)
}

type CardKeysService struct {
	repository CardKeysRepository
}

func NewCardKeysService(repository CardKeysRepository) *CardKeysService {
	return &CardKeysService{repository: repository}
}

func (s *CardKeysService) ListCardKeys(ctx context.Context, params domain.ListCardKeysParams) (domain.PaginatedCardKeysResponse, error) {
	return s.repository.ListCardKeys(ctx, params)
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
		return nil, errors.New("invalid expiration")
	}
	return &expires, nil
}
