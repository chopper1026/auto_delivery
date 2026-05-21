package service

import (
	"testing"
	"time"

	"auto_delivery/backend/internal/domain"
)

func TestBuildOverviewResponseCalculatesStatusDistributionAndTrend(t *testing.T) {
	now := time.Date(2026, 5, 21, 18, 30, 0, 0, time.UTC)
	overview := BuildOverviewResponse(
		now,
		domain.OverviewCounts{
			TotalCardKeys:     6,
			ActiveCardKeys:    2,
			RedeemedCardKeys:  3,
			ExpiredCardKeys:   1,
			TodaysRedemptions: 4,
			TodaysDownloads:   5,
		},
		[]domain.FileInventoryStat{{GoodsID: "goods-1", GoodsName: "Package", Total: 2, Available: 1, Reserved: 1}},
		map[string]int{"2026-05-15": 7, "2026-05-21": 4},
		map[string]int{"2026-05-15": 1, "2026-05-21": 5},
	)

	if overview.CardKeyStatus.Total != 6 || overview.CardKeyStatus.ActivePercent != 33 || overview.CardKeyStatus.RedeemedPercent != 50 || overview.CardKeyStatus.ExpiredPercent != 17 {
		t.Fatalf("status distribution = %#v", overview.CardKeyStatus)
	}
	if len(overview.DeliveryTrend) != 7 {
		t.Fatalf("trend length = %d, want 7", len(overview.DeliveryTrend))
	}
	if first := overview.DeliveryTrend[0]; first.DateKey != "2026-05-15" || first.Redemptions != 7 || first.Downloads != 1 {
		t.Fatalf("first trend day = %#v", first)
	}
	if last := overview.DeliveryTrend[6]; last.DateKey != "2026-05-21" || last.Redemptions != 4 || last.Downloads != 5 {
		t.Fatalf("last trend day = %#v", last)
	}
}
