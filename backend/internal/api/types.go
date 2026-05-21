package api

import (
	"time"

	"auto_delivery/backend/internal/domain"
)

type Inventory = domain.Inventory
type Usage = domain.Usage
type Goods = domain.Goods
type PaginatedGoodsResponse = domain.PaginatedGoodsResponse
type CardKey = domain.CardKey
type PaginatedCardKeysResponse = domain.PaginatedCardKeysResponse
type Receipt = domain.Receipt

type AuditLog struct {
	ID         string    `json:"id"`
	Action     string    `json:"action"`
	EntityType string    `json:"entityType"`
	EntityID   string    `json:"entityId,omitempty"`
	Username   string    `json:"username,omitempty"`
	IP         string    `json:"ipAddress"`
	UserAgent  string    `json:"userAgent"`
	Metadata   string    `json:"metadata,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`
}

type RedemptionLogItem struct {
	ID          string    `json:"id"`
	RedeemedAt  time.Time `json:"redeemedAt"`
	CardKeyMask string    `json:"cardKeyMask"`
	GoodsName   string    `json:"goodsName"`
	IPAddress   string    `json:"ipAddress"`
	UserAgent   string    `json:"userAgent"`
}

type DownloadLogItem struct {
	ID          string    `json:"id"`
	CreatedAt   time.Time `json:"createdAt"`
	Result      string    `json:"result"`
	CardKeyMask string    `json:"cardKeyMask,omitempty"`
	GoodsName   string    `json:"goodsName,omitempty"`
	IPAddress   string    `json:"ipAddress"`
	UserAgent   string    `json:"userAgent"`
}

type AdminLogItem struct {
	ID         string    `json:"id"`
	CreatedAt  time.Time `json:"createdAt"`
	Action     string    `json:"action"`
	EntityType string    `json:"entityType"`
	EntityID   string    `json:"entityId,omitempty"`
	Username   string    `json:"username,omitempty"`
	IPAddress  string    `json:"ipAddress"`
	UserAgent  string    `json:"userAgent"`
	Metadata   string    `json:"metadata,omitempty"`
}

type LogsResponse struct {
	Type       string `json:"type"`
	Items      any    `json:"items"`
	Page       int    `json:"page"`
	PageSize   int    `json:"pageSize"`
	TotalItems int    `json:"totalItems"`
	TotalPages int    `json:"totalPages"`
}

type FileInventoryStat struct {
	GoodsID   string `json:"goodsId"`
	GoodsName string `json:"goodsName"`
	Total     int    `json:"total"`
	Available int    `json:"available"`
	Reserved  int    `json:"reserved"`
	Redeemed  int    `json:"redeemed"`
}

type DeliveryTrendDay struct {
	DateKey     string `json:"dateKey"`
	Label       string `json:"label"`
	Redemptions int    `json:"redemptions"`
	Downloads   int    `json:"downloads"`
}

type CardKeyStatusDistribution struct {
	Active          int `json:"active"`
	Redeemed        int `json:"redeemed"`
	Expired         int `json:"expired"`
	Total           int `json:"total"`
	ActivePercent   int `json:"activePercent"`
	RedeemedPercent int `json:"redeemedPercent"`
	ExpiredPercent  int `json:"expiredPercent"`
}

type OverviewResponse struct {
	TotalCardKeys     int                       `json:"totalCardKeys"`
	ActiveCardKeys    int                       `json:"activeCardKeys"`
	RedeemedCardKeys  int                       `json:"redeemedCardKeys"`
	ExpiredCardKeys   int                       `json:"expiredCardKeys"`
	TodaysRedemptions int                       `json:"todaysRedemptions"`
	TodaysDownloads   int                       `json:"todaysDownloads"`
	FileInventory     []FileInventoryStat       `json:"fileInventory"`
	CardKeyStatus     CardKeyStatusDistribution `json:"cardKeyStatus"`
	DeliveryTrend     []DeliveryTrendDay        `json:"deliveryTrend"`
}
