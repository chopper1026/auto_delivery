package api

import (
	"errors"
	"fmt"
	"testing"
	"time"

	"auto_delivery/backend/internal/security"
	"auto_delivery/backend/internal/testutil"

	"github.com/jackc/pgx/v5/pgxpool"
)

func createIntegrationFileGoods(t *testing.T, pool *pgxpool.Pool, fileCount int) string {
	t.Helper()
	var goodsID string
	if err := pool.QueryRow(t.Context(), `
		INSERT INTO goods (name, type, note)
		VALUES ('并发文件包', 'FILE', 'integration')
		RETURNING id::text
	`).Scan(&goodsID); err != nil {
		t.Fatalf("insert file goods: %v", err)
	}
	for i := 0; i < fileCount; i++ {
		if _, err := pool.Exec(t.Context(), `
			INSERT INTO goods_files (goods_id, original_name, stored_name, storage_path, size_bytes, mime_type, sha256)
			VALUES ($1, $2, $2, $3, 2, 'application/json', $4)
		`, goodsID, fmt.Sprintf("file-%d.json", i+1), fmt.Sprintf("/tmp/file-%d.json", i+1), fmt.Sprintf("sha-%d", i+1)); err != nil {
			t.Fatalf("insert goods file: %v", err)
		}
	}
	return goodsID
}

func TestCardKeyReservationConcurrencyIntegration(t *testing.T) {
	pool := testutil.OpenTestDB(t)
	defer pool.Close()
	app := newIntegrationApp(t, pool)
	goodsID := createIntegrationFileGoods(t, pool, 1)

	start := make(chan struct{})
	results := make(chan error, 2)
	for i := 0; i < 2; i++ {
		go func() {
			<-start
			_, err := app.generateCardKey(t.Context(), generateCardKeyRequest{
				GoodsID:      goodsID,
				Expiration:   "never",
				FileQuantity: 1,
			})
			results <- err
		}()
	}
	close(start)

	successes := 0
	inventoryConflicts := 0
	for i := 0; i < 2; i++ {
		err := <-results
		switch {
		case err == nil:
			successes++
		case errors.Is(err, errNotEnoughInventory):
			inventoryConflicts++
		default:
			t.Fatalf("unexpected generation error: %v", err)
		}
	}
	if successes != 1 || inventoryConflicts != 1 {
		t.Fatalf("successes = %d, inventoryConflicts = %d; want 1 and 1", successes, inventoryConflicts)
	}

	var reserved int
	var distinctCards int
	if err := pool.QueryRow(t.Context(), `
		SELECT count(*)::int, count(DISTINCT reserved_by_card_key_id)::int
		FROM goods_files
		WHERE goods_id = $1 AND status = 'RESERVED'
	`, goodsID).Scan(&reserved, &distinctCards); err != nil {
		t.Fatalf("count reserved files: %v", err)
	}
	if reserved != 1 || distinctCards != 1 {
		t.Fatalf("reserved = %d, distinctCards = %d; want 1 and 1", reserved, distinctCards)
	}
}

func TestExpiredFileCardKeyReleasesReservedInventoryIntegration(t *testing.T) {
	pool := testutil.OpenTestDB(t)
	defer pool.Close()
	app := newIntegrationApp(t, pool)
	goodsID := createIntegrationFileGoods(t, pool, 1)
	cardKey, err := security.GenerateCardKey()
	if err != nil {
		t.Fatalf("generate card key: %v", err)
	}

	var cardID string
	if err := pool.QueryRow(t.Context(), `
		INSERT INTO card_keys (key_hash, key_mask, goods_id, goods_type, file_quantity, expires_at)
		VALUES ($1, $2, $3, 'FILE', 1, $4)
		RETURNING id::text
	`, security.LookupHash(cardKey, app.cfg.SecretPepper), security.MaskSecret(cardKey), goodsID, time.Now().Add(-time.Hour)).Scan(&cardID); err != nil {
		t.Fatalf("insert expired card key: %v", err)
	}
	if _, err := pool.Exec(t.Context(), `
		UPDATE goods_files
		SET status = 'RESERVED',
		    reserved_by_card_key_id = $1,
		    reserved_at = now()
		WHERE goods_id = $2
	`, cardID, goodsID); err != nil {
		t.Fatalf("reserve file: %v", err)
	}

	if _, err := app.redeemCardKey(t.Context(), cardKey, "127.0.0.1", "integration-test"); err == nil {
		t.Fatal("expected expired card key redemption to fail")
	}

	var status string
	var available int
	if err := pool.QueryRow(t.Context(), `SELECT status::text FROM card_keys WHERE id = $1`, cardID).Scan(&status); err != nil {
		t.Fatalf("read card status: %v", err)
	}
	if err := pool.QueryRow(t.Context(), `
		SELECT count(*)::int
		FROM goods_files
		WHERE goods_id = $1
		  AND status = 'AVAILABLE'
		  AND reserved_by_card_key_id IS NULL
		  AND reserved_at IS NULL
	`, goodsID).Scan(&available); err != nil {
		t.Fatalf("count released inventory: %v", err)
	}
	if status != "EXPIRED" || available != 1 {
		t.Fatalf("status = %q, available = %d; want EXPIRED and 1", status, available)
	}
}
