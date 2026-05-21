package service

import (
	"context"
	"time"

	"auto_delivery/backend/internal/domain"
	"auto_delivery/backend/internal/security"
	"auto_delivery/backend/internal/storage"
)

type DownloadsRepository interface {
	GetReceipt(context.Context, string) (domain.Receipt, error)
	ClaimDownload(context.Context, string, string, time.Time, string, string) (domain.DownloadClaim, error)
	CompleteDownloadClaim(context.Context, string, string, string, string) error
	ReleaseDownloadClaim(context.Context, string, string, string, string) error
}

type DownloadsService struct {
	repository   DownloadsRepository
	secretPepper string
	claimTTL     time.Duration
}

func NewDownloadsService(repository DownloadsRepository, secretPepper string, claimTTL time.Duration) *DownloadsService {
	return &DownloadsService{repository: repository, secretPepper: secretPepper, claimTTL: claimTTL}
}

func (s *DownloadsService) GetReceipt(ctx context.Context, receiptToken string) (domain.Receipt, error) {
	return s.repository.GetReceipt(ctx, security.LookupHash(receiptToken, s.secretPepper))
}

func (s *DownloadsService) ClaimDownload(ctx context.Context, receiptToken string, ip string, ua string) (domain.DownloadClaim, error) {
	claimToken, err := security.RandomToken()
	if err != nil {
		return domain.DownloadClaim{}, err
	}
	claim, err := s.repository.ClaimDownload(
		ctx,
		security.LookupHash(receiptToken, s.secretPepper),
		security.LookupHash(claimToken, s.secretPepper),
		time.Now().Add(s.claimTTL),
		ip,
		ua,
	)
	if err != nil {
		return domain.DownloadClaim{}, err
	}
	claim.ClaimToken = claimToken
	claim.Filename = storage.SanitizeEntryName(claim.GoodsName) + ".zip"
	return claim, nil
}

func (s *DownloadsService) CompleteDownloadClaim(ctx context.Context, redemptionID string, claimToken string, ip string, ua string) error {
	return s.repository.CompleteDownloadClaim(ctx, redemptionID, security.LookupHash(claimToken, s.secretPepper), ip, ua)
}

func (s *DownloadsService) ReleaseDownloadClaim(ctx context.Context, redemptionID string, claimToken string, ip string, ua string) error {
	return s.repository.ReleaseDownloadClaim(ctx, redemptionID, security.LookupHash(claimToken, s.secretPepper), ip, ua)
}
