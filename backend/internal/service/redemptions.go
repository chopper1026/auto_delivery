package service

import (
	"context"
	"path/filepath"

	"auto_delivery/backend/internal/domain"
	"auto_delivery/backend/internal/security"
	"auto_delivery/backend/internal/storage"
)

type RedemptionsRepository interface {
	ReserveRedemption(context.Context, string, string, string, string, string) (domain.ReservedRedemption, error)
	FinalizeFileRedemption(context.Context, domain.ReservedRedemption, string, int64) error
	FailFileRedemption(context.Context, string) error
}

type RedemptionsService struct {
	repository   RedemptionsRepository
	secretPepper string
	storageRoot  string
}

func NewRedemptionsService(repository RedemptionsRepository, secretPepper string, storageRoot string) *RedemptionsService {
	return &RedemptionsService{repository: repository, secretPepper: secretPepper, storageRoot: storageRoot}
}

func (s *RedemptionsService) RedeemCardKey(ctx context.Context, cardKey string, ip string, ua string) (domain.RedeemResult, error) {
	cardKey = security.NormalizeCardKey(cardKey)
	if !security.IsCardKey(cardKey) {
		return domain.RedeemResult{}, domain.ErrInvalidCardKey
	}
	receiptToken, err := security.RandomToken()
	if err != nil {
		return domain.RedeemResult{}, err
	}
	reserved, err := s.repository.ReserveRedemption(
		ctx,
		security.LookupHash(cardKey, s.secretPepper),
		security.LookupHash(receiptToken, s.secretPepper),
		security.MaskSecret(receiptToken),
		ip,
		ua,
	)
	if err != nil {
		return domain.RedeemResult{}, err
	}
	if reserved.GoodsType == "FILE" {
		if err := s.finalizeFileRedemption(ctx, reserved); err != nil {
			_ = s.repository.FailFileRedemption(ctx, reserved.RedemptionID)
			return domain.RedeemResult{}, domain.ErrPrepareRedemptionFiles
		}
	}
	return domain.RedeemResult{ReceiptToken: receiptToken, GoodsType: reserved.GoodsType}, nil
}

func (s *RedemptionsService) finalizeFileRedemption(ctx context.Context, reserved domain.ReservedRedemption) error {
	zipPath := filepath.Join(s.storageRoot, "zips", reserved.RedemptionID+".zip")
	zipEntries := make([]storage.ZipEntry, 0, len(reserved.Files))
	for _, file := range reserved.Files {
		zipEntries = append(zipEntries, storage.ZipEntry{Path: file.StoragePath, EntryName: file.OriginalName})
	}
	size, err := storage.CreateZipFromFiles(zipEntries, zipPath)
	if err != nil {
		storage.RemovePath(zipPath)
		return err
	}
	committed := false
	defer func() {
		if !committed {
			storage.RemovePath(zipPath)
		}
	}()
	if err := s.repository.FinalizeFileRedemption(ctx, reserved, zipPath, size); err != nil {
		return err
	}
	committed = true
	return nil
}
