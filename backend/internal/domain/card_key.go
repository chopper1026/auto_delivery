package domain

import (
	"errors"
	"time"
)

var (
	ErrNotEnoughInventory = errors.New("not enough inventory")
	ErrCardKeyNotFound    = errors.New("card key not found")
	ErrCardKeyRedeemed    = errors.New("card key redeemed")
)

type CardKeyStatus string

const (
	CardKeyActive   CardKeyStatus = "ACTIVE"
	CardKeyRedeemed CardKeyStatus = "REDEEMED"
	CardKeyExpired  CardKeyStatus = "EXPIRED"
	CardKeyDeleted  CardKeyStatus = "DELETED"
)

type GeneratedCardKey struct {
	ID              string     `json:"id"`
	PlaintextKey    string     `json:"plaintextKey"`
	KeyMask         string     `json:"keyMask"`
	DeliveryMessage string     `json:"deliveryMessage"`
	ExpiresAt       *time.Time `json:"expiresAt,omitempty"`
	CreatedAt       time.Time  `json:"createdAt"`
}

type GenerateCardKeyInput struct {
	GoodsID      string
	Expiration   string
	FileQuantity int
}

type CreateCardKeyInput struct {
	GoodsID      string
	KeyHash      string
	KeyMask      string
	FileQuantity int
	ExpiresAt    *time.Time
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
