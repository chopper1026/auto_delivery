package domain

import "errors"

var (
	ErrInvalidCardKey          = errors.New("invalid card key")
	ErrCardKeyNotRedeemable    = errors.New("card key is not redeemable")
	ErrPrepareRedemptionFiles  = errors.New("failed to prepare redemption files")
	ErrReservedFilesNotFound   = errors.New("reserved files not found")
	ErrReservedFileCountChange = errors.New("reserved file count changed")
)

type RedeemResult struct {
	ReceiptToken string
	GoodsType    string
}

type ReservedFile struct {
	ID           string
	OriginalName string
	StoragePath  string
}

type ReservedRedemption struct {
	RedemptionID string
	CardID       string
	GoodsType    string
	Files        []ReservedFile
}
