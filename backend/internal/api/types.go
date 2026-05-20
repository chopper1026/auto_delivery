package api

import "time"

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

type PaginatedGoodsResponse struct {
	Items      []Goods `json:"items"`
	Page       int     `json:"page"`
	PageSize   int     `json:"pageSize"`
	TotalItems int     `json:"totalItems"`
	TotalPages int     `json:"totalPages"`
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

type PaginatedCardKeysResponse struct {
	Items      []CardKey `json:"items"`
	Page       int       `json:"page"`
	PageSize   int       `json:"pageSize"`
	TotalItems int       `json:"totalItems"`
	TotalPages int       `json:"totalPages"`
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
