package domain

import (
	"errors"
	"time"
)

var ErrAlreadyDownloaded = errors.New("already downloaded")

type DownloadClaim struct {
	RedemptionID string
	ClaimToken   string
	ZipPath      string
	Filename     string
	GoodsName    string
	FileQuantity int
}

type Receipt struct {
	Kind         string    `json:"kind"`
	GoodsName    string    `json:"goodsName"`
	TextContent  string    `json:"textContent,omitempty"`
	GoodsNote    string    `json:"goodsNote,omitempty"`
	RedeemedAt   time.Time `json:"redeemedAt"`
	Downloaded   bool      `json:"downloaded"`
	FileQuantity int       `json:"fileQuantity,omitempty"`
}
