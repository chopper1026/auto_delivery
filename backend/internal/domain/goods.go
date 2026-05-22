package domain

import (
	"errors"
	"time"
)

var (
	ErrInvalidGoodsInput = errors.New("invalid goods input")
	ErrGoodsNotFound     = errors.New("goods not found")
	ErrGoodsNotFileType  = errors.New("goods is not file type")
	ErrGoodsHasCardKeys  = errors.New("goods has card keys")
	ErrGoodsDisabled     = errors.New("goods is disabled")
)

type GoodsType string

const (
	GoodsText GoodsType = "TEXT"
	GoodsFile GoodsType = "FILE"
)

type Inventory struct {
	Total     int `json:"total"`
	Available int `json:"available"`
	Reserved  int `json:"reserved"`
	Redeemed  int `json:"redeemed"`
}

type Usage struct {
	CardKeys    int `json:"cardKeys"`
	Redemptions int `json:"redemptions"`
}

type Goods struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Type        string    `json:"type"`
	TextContent string    `json:"textContent,omitempty"`
	Note        string    `json:"note,omitempty"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
	Inventory   Inventory `json:"inventory"`
	Usage       Usage     `json:"usage"`
}

type ListGoodsParams struct {
	Query    string
	Status   string
	Page     int
	PageSize int
}

type CreateGoodsInput struct {
	Name        string
	Type        string
	TextContent string
	Note        string
}

type UpdateGoodsInput struct {
	Name        *string
	TextContent *string
	Note        *string
	Status      *string
}

type GoodsFileUpload struct {
	OriginalName string
	StoredName   string
	StoragePath  string
	SizeBytes    int64
	MimeType     string
	SHA256       string
}

type GoodsFileExportEntry struct {
	OriginalName string
	StoragePath  string
	Status       string
	CardKeyMask  string
	ReservedAt   *time.Time
	RedeemedAt   *time.Time
	GoodsName    string
}

type PaginatedGoodsResponse struct {
	Items      []Goods `json:"items"`
	Page       int     `json:"page"`
	PageSize   int     `json:"pageSize"`
	TotalItems int     `json:"totalItems"`
	TotalPages int     `json:"totalPages"`
}
