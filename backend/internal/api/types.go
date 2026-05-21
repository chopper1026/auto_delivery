package api

import "auto_delivery/backend/internal/domain"

type Inventory = domain.Inventory
type Usage = domain.Usage
type Goods = domain.Goods
type PaginatedGoodsResponse = domain.PaginatedGoodsResponse
type CardKey = domain.CardKey
type PaginatedCardKeysResponse = domain.PaginatedCardKeysResponse
type Receipt = domain.Receipt
type adminContext = domain.AdminContext
type AuditLog = domain.AuditLog
type RedemptionLogItem = domain.RedemptionLogItem
type DownloadLogItem = domain.DownloadLogItem
type AdminLogItem = domain.AdminLogItem
type LogsResponse = domain.LogsResponse
type FileInventoryStat = domain.FileInventoryStat
type DeliveryTrendDay = domain.DeliveryTrendDay
type CardKeyStatusDistribution = domain.CardKeyStatusDistribution
type OverviewResponse = domain.OverviewResponse
