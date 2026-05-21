package service

import (
	"context"
	"errors"
	"testing"

	"auto_delivery/backend/internal/domain"
	"auto_delivery/backend/internal/security"
)

type redemptionsRepositoryStub struct {
	keyHash         string
	receiptHash     string
	receiptMask     string
	reserved        domain.ReservedRedemption
	abortedReserved domain.ReservedRedemption
}

func (r *redemptionsRepositoryStub) ReserveRedemption(_ context.Context, keyHash string, receiptHash string, receiptMask string, _ string, _ string) (domain.ReservedRedemption, error) {
	r.keyHash = keyHash
	r.receiptHash = receiptHash
	r.receiptMask = receiptMask
	return r.reserved, nil
}

func (r *redemptionsRepositoryStub) FinalizeFileRedemption(context.Context, domain.ReservedRedemption, string, int64) error {
	return nil
}

func (r *redemptionsRepositoryStub) AbortFileRedemption(_ context.Context, reserved domain.ReservedRedemption) error {
	r.abortedReserved = reserved
	return nil
}

func TestRedemptionsServiceRedeemsTextCardWithHashedLookup(t *testing.T) {
	cardKey, err := security.GenerateCardKey()
	if err != nil {
		t.Fatal(err)
	}
	repo := &redemptionsRepositoryStub{
		reserved: domain.ReservedRedemption{RedemptionID: "redemption-1", GoodsType: "TEXT"},
	}
	service := NewRedemptionsService(repo, "pepper", t.TempDir())

	result, err := service.RedeemCardKey(t.Context(), cardKey, "127.0.0.1", "unit-test")
	if err != nil {
		t.Fatal(err)
	}
	if result.ReceiptToken == "" || result.GoodsType != "TEXT" {
		t.Fatalf("result = %#v", result)
	}
	if repo.keyHash == "" || repo.keyHash == cardKey {
		t.Fatalf("key hash = %q, plaintext = %q", repo.keyHash, cardKey)
	}
	if repo.receiptHash == "" || repo.receiptHash == result.ReceiptToken || repo.receiptMask == "" {
		t.Fatalf("receipt hash/mask = %q/%q token=%q", repo.receiptHash, repo.receiptMask, result.ReceiptToken)
	}
}

func TestFileRedemptionFailureAbortsReservation(t *testing.T) {
	cardKey, err := security.GenerateCardKey()
	if err != nil {
		t.Fatal(err)
	}
	repo := &redemptionsRepositoryStub{
		reserved: domain.ReservedRedemption{
			RedemptionID: "redemption-1",
			CardID:       "card-1",
			GoodsType:    "FILE",
			Files: []domain.ReservedFile{{
				ID:           "file-1",
				OriginalName: "missing.json",
				StoragePath:  "/path/that/does/not/exist.json",
			}},
		},
	}
	service := NewRedemptionsService(repo, "pepper", t.TempDir())

	_, err = service.RedeemCardKey(t.Context(), cardKey, "127.0.0.1", "unit-test")

	if !errors.Is(err, domain.ErrPrepareRedemptionFiles) {
		t.Fatalf("err = %v, want ErrPrepareRedemptionFiles", err)
	}
	if repo.abortedReserved.RedemptionID != repo.reserved.RedemptionID || repo.abortedReserved.CardID != repo.reserved.CardID {
		t.Fatalf("aborted reservation = %#v, want %#v", repo.abortedReserved, repo.reserved)
	}
}
