package api

import (
	"context"
	"errors"
	"io"
	"net/http"
	"os"
	"strconv"
	"time"

	"auto_delivery/backend/internal/domain"

	"github.com/gin-gonic/gin"
)

type redeemRequest struct {
	CardKey string `json:"cardKey"`
}

func (a *App) handleRedeem(c *gin.Context) {
	if !a.consumeRateLimit(c.Request.Context(), "public-redeem", a.clientIP(c), 20, 15*time.Minute) {
		jsonError(c, http.StatusTooManyRequests, "too many redemption attempts")
		return
	}
	var req redeemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		jsonError(c, http.StatusBadRequest, "invalid redeem request")
		return
	}
	result, err := a.redeemCardKey(c.Request.Context(), req.CardKey, a.clientIP(c), userAgent(c))
	if err != nil {
		if errors.Is(err, errPrepareRedemptionFiles) {
			jsonError(c, http.StatusInternalServerError, "failed to prepare redemption files")
			return
		}
		jsonError(c, http.StatusBadRequest, "card key is not redeemable")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"receiptToken": result.receiptToken,
		"receiptPath":  "/receipt/" + result.receiptToken,
		"goodsType":    result.goodsType,
	})
}

func (a *App) handleReceipt(c *gin.Context) {
	receipt, err := a.getReceipt(c.Request.Context(), c.Param("token"))
	if err != nil {
		jsonError(c, http.StatusNotFound, "receipt not found")
		return
	}
	c.JSON(http.StatusOK, receipt)
}

func (a *App) handleReceiptStatus(c *gin.Context) {
	receipt, err := a.getReceipt(c.Request.Context(), c.Param("token"))
	if err != nil {
		jsonError(c, http.StatusNotFound, "receipt not found")
		return
	}
	c.JSON(http.StatusOK, gin.H{"kind": receipt.Kind, "downloaded": receipt.Downloaded})
}

func (a *App) handleDownload(c *gin.Context) {
	if !a.consumeRateLimit(c.Request.Context(), "public-download", a.clientIP(c), 30, 15*time.Minute) {
		jsonError(c, http.StatusTooManyRequests, "too many download attempts")
		return
	}
	claim, err := a.claimDownload(c.Request.Context(), c.Param("token"), a.clientIP(c), userAgent(c))
	if err != nil {
		if errors.Is(err, errAlreadyDownloaded) {
			c.Redirect(http.StatusFound, "/download/already-downloaded?receipt="+c.Param("token"))
			return
		}
		jsonError(c, http.StatusNotFound, "download not found")
		return
	}
	file, err := os.Open(claim.zipPath)
	if err != nil {
		_ = a.releaseDownloadClaim(c.Request.Context(), claim.redemptionID, claim.claimToken, a.clientIP(c), userAgent(c))
		jsonError(c, http.StatusInternalServerError, "download file is missing")
		return
	}
	defer file.Close()
	info, err := file.Stat()
	if err != nil {
		_ = a.releaseDownloadClaim(c.Request.Context(), claim.redemptionID, claim.claimToken, a.clientIP(c), userAgent(c))
		jsonError(c, http.StatusInternalServerError, "download file is missing")
		return
	}
	c.Header("Content-Type", "application/zip")
	c.Header("Content-Length", strconv.FormatInt(info.Size(), 10))
	c.Header("Content-Disposition", `attachment; filename="`+claim.filename+`"`)
	if _, err := io.Copy(c.Writer, file); err != nil {
		_ = a.releaseDownloadClaim(c.Request.Context(), claim.redemptionID, claim.claimToken, a.clientIP(c), userAgent(c))
		return
	}
	_ = a.completeDownloadClaim(c.Request.Context(), claim.redemptionID, claim.claimToken, a.clientIP(c), userAgent(c))
}

type redeemResult struct {
	receiptToken string
	goodsType    string
}

var errPrepareRedemptionFiles = domain.ErrPrepareRedemptionFiles

func (a *App) redeemCardKey(ctx context.Context, cardKey string, ip string, ua string) (redeemResult, error) {
	if a.redemptions == nil {
		return redeemResult{}, errors.New("redemptions service is unavailable")
	}
	result, err := a.redemptions.RedeemCardKey(ctx, cardKey, ip, ua)
	if err != nil {
		return redeemResult{}, err
	}
	return redeemResult{receiptToken: result.ReceiptToken, goodsType: result.GoodsType}, nil
}

func (a *App) getReceipt(ctx context.Context, token string) (Receipt, error) {
	if a.downloads == nil {
		return Receipt{}, errors.New("downloads service is unavailable")
	}
	return a.downloads.GetReceipt(ctx, token)
}

var errAlreadyDownloaded = domain.ErrAlreadyDownloaded

type downloadClaim struct {
	redemptionID string
	claimToken   string
	zipPath      string
	filename     string
}

func (a *App) claimDownload(ctx context.Context, receiptToken string, ip string, ua string) (downloadClaim, error) {
	if a.downloads == nil {
		return downloadClaim{}, errors.New("downloads service is unavailable")
	}
	claim, err := a.downloads.ClaimDownload(ctx, receiptToken, ip, ua)
	if err != nil {
		return downloadClaim{}, err
	}
	return downloadClaim{
		redemptionID: claim.RedemptionID,
		claimToken:   claim.ClaimToken,
		zipPath:      claim.ZipPath,
		filename:     claim.Filename,
	}, nil
}

func (a *App) completeDownloadClaim(ctx context.Context, redemptionID string, claimToken string, ip string, ua string) error {
	if a.downloads == nil {
		return errors.New("downloads service is unavailable")
	}
	return a.downloads.CompleteDownloadClaim(ctx, redemptionID, claimToken, ip, ua)
}

func (a *App) releaseDownloadClaim(ctx context.Context, redemptionID string, claimToken string, ip string, ua string) error {
	if a.downloads == nil {
		return errors.New("downloads service is unavailable")
	}
	return a.downloads.ReleaseDownloadClaim(ctx, redemptionID, claimToken, ip, ua)
}
