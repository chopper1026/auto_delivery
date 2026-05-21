package api

import (
	"bytes"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"auto_delivery/backend/internal/security"
	"auto_delivery/backend/internal/testutil"
)

func TestParseGoodsListParams(t *testing.T) {
	params, err := parseGoodsListParams(url.Values{
		"q":        {"  会员  "},
		"status":   {"active"},
		"page":     {"2"},
		"pageSize": {"500"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if params.Query != "会员" || params.Status != "ACTIVE" || params.Page != 2 || params.PageSize != 100 {
		t.Fatalf("params = %#v", params)
	}
}

func TestParseGoodsListParamsRejectsInvalidStatus(t *testing.T) {
	_, err := parseGoodsListParams(url.Values{"status": {"DELETED"}})
	if err == nil {
		t.Fatal("expected invalid status error")
	}
}

func TestBuildGoodsListWhereUsesParameterizedFilters(t *testing.T) {
	where, args := buildGoodsListWhere(goodsListParams{Query: "会员", Status: "ACTIVE"})
	if !strings.Contains(where, "g.name ILIKE $1") || !strings.Contains(where, "g.status = $2") {
		t.Fatalf("where clause did not use expected placeholders: %s", where)
	}
	if strings.Contains(where, "会员") || strings.Contains(where, "ACTIVE'") {
		t.Fatalf("where clause should not interpolate user input: %s", where)
	}
	if len(args) != 2 || args[0] != "%会员%" || args[1] != "ACTIVE" {
		t.Fatalf("args = %#v", args)
	}
}

func TestGoodsPaginationTotalPagesHasMinimumOne(t *testing.T) {
	if got := totalPages(0, 10); got != 1 {
		t.Fatalf("totalPages(0, 10) = %d, want 1", got)
	}
	if got := totalPages(21, 10); got != 3 {
		t.Fatalf("totalPages(21, 10) = %d, want 3", got)
	}
}

func TestGoodsExportAuditAction(t *testing.T) {
	if got := goodsExportAuditAction("UNREDEEMED"); got != "goods.export_unredeemed" {
		t.Fatalf("UNREDEEMED action = %q", got)
	}
	if got := goodsExportAuditAction("REDEEMED"); got != "goods.export_redeemed" {
		t.Fatalf("REDEEMED action = %q", got)
	}
}

func TestGoodsListPreAggregatesMultipliedJoinCountsIntegration(t *testing.T) {
	pool := testutil.OpenTestDB(t)
	defer pool.Close()
	app := newIntegrationApp(t, pool)

	var goodsID string
	if err := pool.QueryRow(t.Context(), `
		INSERT INTO goods (name, type, note)
		VALUES ('库存计数文件包', 'FILE', 'count test')
		RETURNING id::text
	`).Scan(&goodsID); err != nil {
		t.Fatalf("insert goods: %v", err)
	}
	for _, name := range []string{"first.json", "second.json"} {
		if _, err := pool.Exec(t.Context(), `
			INSERT INTO goods_files (goods_id, original_name, stored_name, storage_path, size_bytes, mime_type, sha256)
			VALUES ($1, $2, $2, '/tmp/' || $2, 1, 'application/json', $2)
		`, goodsID, name); err != nil {
			t.Fatalf("insert goods file: %v", err)
		}
	}
	for i := 0; i < 3; i++ {
		var cardID string
		cardKey := "goods-count-card-" + string(rune('a'+i))
		if err := pool.QueryRow(t.Context(), `
			INSERT INTO card_keys (key_hash, key_mask, goods_id, goods_type, status, redeemed_at)
			VALUES ($1, $2, $3, 'FILE', 'REDEEMED', now())
			RETURNING id::text
		`, security.LookupHash(cardKey, app.cfg.SecretPepper), "AD-****-****-****-CNT"+string(rune('A'+i)), goodsID).Scan(&cardID); err != nil {
			t.Fatalf("insert card key: %v", err)
		}
		if _, err := pool.Exec(t.Context(), `
			INSERT INTO redemptions (card_key_id, goods_id, receipt_token_hash, receipt_token_mask, ip_address, user_agent)
			VALUES ($1, $2, $3, $4, '127.0.0.1', 'integration-test')
		`, cardID, goodsID, security.LookupHash("goods-count-receipt-"+string(rune('a'+i)), app.cfg.SecretPepper), "receipt-"+string(rune('a'+i))); err != nil {
			t.Fatalf("insert redemption: %v", err)
		}
	}

	payload, err := app.listGoods(t.Context(), goodsListParams{Page: 1, PageSize: 10})
	if err != nil {
		t.Fatalf("list goods: %v", err)
	}
	if len(payload.Items) == 0 {
		t.Fatal("expected goods item")
	}
	if got, want := payload.Items[0].Inventory.Total, 2; got != want {
		t.Fatalf("inventory total = %d, want %d", got, want)
	}
}

func TestFileDeliveryFullFlowIntegration(t *testing.T) {
	pool := testutil.OpenTestDB(t)
	defer pool.Close()
	app := newIntegrationApp(t, pool)
	cookie, csrf := loginIntegrationAdmin(t, app)

	createGoods := performJSONRequest(t, app, http.MethodPost, "/api/admin/goods", cookie, csrf, `{"name":"CPA 文件包","type":"FILE","note":"下载后请先解压"}`)
	if createGoods.Code != http.StatusCreated {
		t.Fatalf("create goods status = %d, body = %s", createGoods.Code, createGoods.Body.String())
	}
	var created struct {
		ID string `json:"id"`
	}
	created = decodeResponse[struct {
		ID string `json:"id"`
	}](t, createGoods)
	if created.ID == "" {
		t.Fatal("create goods response did not include id")
	}

	var uploadBody bytes.Buffer
	writer := multipart.NewWriter(&uploadBody)
	for _, file := range []struct {
		name string
		body string
	}{
		{name: "first.json", body: `{"account":"first"}`},
		{name: "second.json", body: `{"account":"second"}`},
	} {
		part, err := writer.CreateFormFile("files", file.name)
		if err != nil {
			t.Fatalf("create multipart file: %v", err)
		}
		if _, err := io.WriteString(part, file.body); err != nil {
			t.Fatalf("write multipart file: %v", err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close multipart writer: %v", err)
	}
	uploadReq := httptest.NewRequest(http.MethodPost, "/api/admin/goods/"+created.ID+"/files", &uploadBody)
	uploadReq.Header.Set("Content-Type", writer.FormDataContentType())
	uploadReq.Header.Set("X-CSRF-Token", csrf)
	uploadReq.Header.Set("User-Agent", "integration-test")
	uploadReq.AddCookie(cookie)
	upload := performRequest(t, app, uploadReq)
	if upload.Code != http.StatusOK {
		t.Fatalf("upload status = %d, body = %s", upload.Code, upload.Body.String())
	}

	generate := performJSONRequest(t, app, http.MethodPost, "/api/admin/card-keys", cookie, csrf, `{"goodsId":"`+created.ID+`","expiration":"never","fileQuantity":2}`)
	if generate.Code != http.StatusCreated {
		t.Fatalf("generate status = %d, body = %s", generate.Code, generate.Body.String())
	}
	var generated struct {
		PlaintextKey string `json:"plaintextKey"`
	}
	generated = decodeResponse[struct {
		PlaintextKey string `json:"plaintextKey"`
	}](t, generate)
	if generated.PlaintextKey == "" {
		t.Fatal("generate response did not include plaintext key")
	}

	redeem := performJSONRequest(t, app, http.MethodPost, "/api/public/redeem", nil, "", `{"cardKey":"`+generated.PlaintextKey+`"}`)
	if redeem.Code != http.StatusOK {
		t.Fatalf("redeem status = %d, body = %s", redeem.Code, redeem.Body.String())
	}
	var redeemed struct {
		ReceiptToken string `json:"receiptToken"`
		GoodsType    string `json:"goodsType"`
	}
	redeemed = decodeResponse[struct {
		ReceiptToken string `json:"receiptToken"`
		GoodsType    string `json:"goodsType"`
	}](t, redeem)
	if redeemed.ReceiptToken == "" || redeemed.GoodsType != "FILE" {
		t.Fatalf("redeem response = %#v", redeemed)
	}

	firstDownload := performRequest(t, app, httptest.NewRequest(http.MethodGet, "/api/download/"+redeemed.ReceiptToken, nil))
	if firstDownload.Code != http.StatusOK {
		t.Fatalf("first download status = %d, body = %s", firstDownload.Code, firstDownload.Body.String())
	}
	if firstDownload.Body.Len() == 0 || !bytes.HasPrefix(firstDownload.Body.Bytes(), []byte("PK")) {
		t.Fatalf("first download is not a zip, len = %d", firstDownload.Body.Len())
	}

	secondDownload := performRequest(t, app, httptest.NewRequest(http.MethodGet, "/api/download/"+redeemed.ReceiptToken, nil))
	if secondDownload.Code != http.StatusFound {
		t.Fatalf("second download status = %d, body = %s", secondDownload.Code, secondDownload.Body.String())
	}
	expectedLocation := "/download/already-downloaded?receipt=" + redeemed.ReceiptToken
	if got := secondDownload.Header().Get("Location"); got != expectedLocation {
		t.Fatalf("second download location = %q, want %q", got, expectedLocation)
	}
}
