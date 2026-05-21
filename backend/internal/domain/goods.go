package domain

import "time"

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

type PaginatedGoodsResponse struct {
	Items      []Goods `json:"items"`
	Page       int     `json:"page"`
	PageSize   int     `json:"pageSize"`
	TotalItems int     `json:"totalItems"`
	TotalPages int     `json:"totalPages"`
}
