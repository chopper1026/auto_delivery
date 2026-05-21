package api

import (
	"testing"

	"auto_delivery/backend/internal/security"
	"auto_delivery/backend/internal/testutil"
)

func TestDownloadClaimReleaseIntegration(t *testing.T) {
	pool := testutil.OpenTestDB(t)
	defer pool.Close()
	app := newIntegrationApp(t, pool)

	var goodsID string
	if err := pool.QueryRow(t.Context(), `
		INSERT INTO goods (name, type, note)
		VALUES ('下载文件包', 'FILE', 'integration')
		RETURNING id::text
	`).Scan(&goodsID); err != nil {
		t.Fatalf("insert goods: %v", err)
	}
	var cardID string
	if err := pool.QueryRow(t.Context(), `
		INSERT INTO card_keys (key_hash, key_mask, goods_id, goods_type, file_quantity, status, redeemed_at)
		VALUES ($1, 'AD-****-****-****-TEST', $2, 'FILE', 1, 'REDEEMED', now())
		RETURNING id::text
	`, security.LookupHash("download-claim-card", app.cfg.SecretPepper), goodsID).Scan(&cardID); err != nil {
		t.Fatalf("insert card key: %v", err)
	}
	receiptToken, err := security.RandomToken()
	if err != nil {
		t.Fatalf("generate receipt token: %v", err)
	}
	var redemptionID string
	if err := pool.QueryRow(t.Context(), `
		INSERT INTO redemptions (card_key_id, goods_id, receipt_token_hash, receipt_token_mask, ip_address, user_agent, zip_path, zip_size_bytes)
		VALUES ($1, $2, $3, $4, '127.0.0.1', 'integration-test', '/tmp/integration.zip', 128)
		RETURNING id::text
	`, cardID, goodsID, security.LookupHash(receiptToken, app.cfg.SecretPepper), security.MaskSecret(receiptToken)).Scan(&redemptionID); err != nil {
		t.Fatalf("insert redemption: %v", err)
	}

	firstClaim, err := app.claimDownload(t.Context(), receiptToken, "127.0.0.1", "integration-test")
	if err != nil {
		t.Fatalf("first claim: %v", err)
	}
	if firstClaim.redemptionID != redemptionID || firstClaim.claimToken == "" {
		t.Fatalf("first claim = %#v", firstClaim)
	}
	var state string
	if err := pool.QueryRow(t.Context(), `SELECT download_state::text FROM redemptions WHERE id = $1`, redemptionID).Scan(&state); err != nil {
		t.Fatalf("read first claim state: %v", err)
	}
	if state != "IN_PROGRESS" {
		t.Fatalf("state after claim = %q, want IN_PROGRESS", state)
	}

	if err := app.releaseDownloadClaim(t.Context(), redemptionID, firstClaim.claimToken, "127.0.0.1", "integration-test"); err != nil {
		t.Fatalf("release claim: %v", err)
	}
	if err := pool.QueryRow(t.Context(), `SELECT download_state::text FROM redemptions WHERE id = $1`, redemptionID).Scan(&state); err != nil {
		t.Fatalf("read released state: %v", err)
	}
	if state != "AVAILABLE" {
		t.Fatalf("state after release = %q, want AVAILABLE", state)
	}

	secondClaim, err := app.claimDownload(t.Context(), receiptToken, "127.0.0.1", "integration-test")
	if err != nil {
		t.Fatalf("second claim: %v", err)
	}
	if secondClaim.claimToken == "" || secondClaim.claimToken == firstClaim.claimToken {
		t.Fatalf("second claim token = %q, first = %q", secondClaim.claimToken, firstClaim.claimToken)
	}

	_, err = pool.Exec(t.Context(), `
		UPDATE redemptions
		SET download_state = 'IN_PROGRESS',
		    download_claim_token_hash = 'expired',
		    download_claim_expires_at = now() - interval '1 minute'
		WHERE id = $1
	`, redemptionID)
	if err != nil {
		t.Fatalf("expire claim: %v", err)
	}

	expiredRecovered, err := app.claimDownload(t.Context(), receiptToken, "127.0.0.1", "integration-test")
	if err != nil {
		t.Fatalf("expired claim should be reusable: %v", err)
	}
	if expiredRecovered.claimToken == "" {
		t.Fatal("expected recovered claim token")
	}
}
