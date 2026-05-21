package domain

import "time"

type CardKeyStatus string

const (
	CardKeyActive   CardKeyStatus = "ACTIVE"
	CardKeyRedeemed CardKeyStatus = "REDEEMED"
	CardKeyExpired  CardKeyStatus = "EXPIRED"
	CardKeyDeleted  CardKeyStatus = "DELETED"
)

type GeneratedCardKey struct {
	ID              string
	PlaintextKey    string
	KeyMask         string
	DeliveryMessage string
	ExpiresAt       *time.Time
	CreatedAt       time.Time
}

type CardKey struct {
	ID           string     `json:"id"`
	KeyMask      string     `json:"keyMask"`
	GoodsID      string     `json:"goodsId"`
	GoodsName    string     `json:"goodsName"`
	GoodsType    string     `json:"goodsType"`
	FileQuantity int        `json:"fileQuantity"`
	ExpiresAt    *time.Time `json:"expiresAt,omitempty"`
	Status       string     `json:"status"`
	CreatedAt    time.Time  `json:"createdAt"`
	RedeemedAt   *time.Time `json:"redeemedAt,omitempty"`
	DeletedAt    *time.Time `json:"deletedAt,omitempty"`
}

type ListCardKeysParams struct {
	Query    string
	Status   string
	Page     int
	PageSize int
}

type PaginatedCardKeysResponse struct {
	Items      []CardKey `json:"items"`
	Page       int       `json:"page"`
	PageSize   int       `json:"pageSize"`
	TotalItems int       `json:"totalItems"`
	TotalPages int       `json:"totalPages"`
}
