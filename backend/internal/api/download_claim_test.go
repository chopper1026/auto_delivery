package api

import (
	"context"
	"testing"
	"time"
)

func claimIsReusable(state string, expiresAt time.Time, now time.Time) bool {
	return state == "IN_PROGRESS" && !expiresAt.IsZero() && expiresAt.Before(now)
}

func TestExpiredDownloadClaimIsReusable(t *testing.T) {
	now := time.Date(2026, 5, 21, 12, 0, 0, 0, time.UTC)
	if !claimIsReusable("IN_PROGRESS", now.Add(-time.Minute), now) {
		t.Fatal("expired IN_PROGRESS claim should be reusable")
	}
	if claimIsReusable("IN_PROGRESS", now.Add(time.Minute), now) {
		t.Fatal("unexpired IN_PROGRESS claim must not be reusable")
	}
	if claimIsReusable("DOWNLOADED", now.Add(-time.Minute), now) {
		t.Fatal("DOWNLOADED claim must not be reusable")
	}
}

func TestDownloadClaimWriteContextOutlivesRequestCancellation(t *testing.T) {
	requestCtx, cancelRequest := context.WithCancel(context.Background())
	cancelRequest()

	ctx, cleanup := downloadClaimWriteContext(requestCtx)
	defer cleanup()

	if err := ctx.Err(); err != nil {
		t.Fatalf("download claim write context error = %v, want nil", err)
	}
	select {
	case <-ctx.Done():
		t.Fatal("download claim write context should not be canceled with request context")
	default:
	}
}
