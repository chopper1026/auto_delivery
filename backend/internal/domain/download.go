package domain

type DownloadClaim struct {
	RedemptionID string
	ClaimToken   string
	ZipPath      string
	Filename     string
}
