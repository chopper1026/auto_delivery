package service

import (
	"context"
	"errors"
	"math"
	"strings"
	"time"

	"auto_delivery/backend/internal/domain"
	"auto_delivery/backend/internal/security"
)

var (
	ErrInvalidAdminCredentials = errors.New("invalid admin credentials")
	ErrUnauthorizedSession     = errors.New("unauthorized session")
	ErrInvalidCSRFToken        = errors.New("invalid csrf token")
)

type AdminRepository interface {
	CountAdminUsers(context.Context) (int, error)
	CreateAdminUser(context.Context, string, string) error
	FindAdminByUsername(context.Context, string) (domain.AdminUser, error)
	CreateAdminSession(context.Context, domain.AdminSessionCreate) error
	UpdateAdminLastLogin(context.Context, string) error
	RefreshAdminSessionCSRF(context.Context, string, string) error
	DeleteAdminSession(context.Context, string) error
	FindAdminSession(context.Context, string) (domain.AdminContext, error)
	WriteAudit(context.Context, domain.AdminAuditEntry) error
	LoadOverviewCounts(context.Context, time.Time) (domain.OverviewCounts, error)
	ListFileInventory(context.Context) ([]domain.FileInventoryStat, error)
	LoadRedemptionTrendCounts(context.Context, time.Time) (map[string]int, error)
	LoadSuccessfulDownloadTrendCounts(context.Context, time.Time) (map[string]int, error)
	CountRedemptionLogs(context.Context, string) (int, error)
	ListRedemptionLogs(context.Context, domain.LogsListParams) ([]domain.RedemptionLogItem, error)
	CountDownloadLogs(context.Context, string) (int, error)
	ListDownloadLogs(context.Context, domain.LogsListParams) ([]domain.DownloadLogItem, error)
	CountAdminAuditLogs(context.Context, string) (int, error)
	ListAdminAuditLogs(context.Context, domain.LogsListParams) ([]domain.AdminLogItem, error)
}

type AdminService struct {
	repository    AdminRepository
	secretPepper  string
	adminUsername string
	adminPassword string
	sessionTTL    time.Duration
}

func NewAdminService(repository AdminRepository, secretPepper string, adminUsername string, adminPassword string, sessionTTL time.Duration) *AdminService {
	return &AdminService{
		repository:    repository,
		secretPepper:  secretPepper,
		adminUsername: adminUsername,
		adminPassword: adminPassword,
		sessionTTL:    sessionTTL,
	}
}

func (s *AdminService) EnsureInitialAdmin(ctx context.Context) error {
	count, err := s.repository.CountAdminUsers(ctx)
	if err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	hash, err := security.HashPassword(s.adminPassword)
	if err != nil {
		return err
	}
	return s.repository.CreateAdminUser(ctx, s.adminUsername, hash)
}

func (s *AdminService) Login(ctx context.Context, username string, password string, ip string, ua string) (domain.AdminLoginResult, error) {
	admin, err := s.repository.FindAdminByUsername(ctx, strings.TrimSpace(username))
	if err != nil {
		return domain.AdminLoginResult{}, ErrInvalidAdminCredentials
	}
	ok, err := security.VerifyPassword(password, admin.PasswordHash)
	if err != nil || !ok {
		return domain.AdminLoginResult{}, ErrInvalidAdminCredentials
	}
	token, err := security.RandomToken()
	if err != nil {
		return domain.AdminLoginResult{}, err
	}
	csrfToken, err := security.RandomToken()
	if err != nil {
		return domain.AdminLoginResult{}, err
	}
	expiresAt := time.Now().Add(s.sessionTTL)
	if err := s.repository.CreateAdminSession(ctx, domain.AdminSessionCreate{
		TokenHash:     security.LookupHash(token, s.secretPepper),
		CSRFTokenHash: security.LookupHash(csrfToken, s.secretPepper),
		AdminUserID:   admin.ID,
		IPAddress:     ip,
		UserAgent:     ua,
		ExpiresAt:     expiresAt,
	}); err != nil {
		return domain.AdminLoginResult{}, err
	}
	_ = s.repository.UpdateAdminLastLogin(ctx, admin.ID)
	return domain.AdminLoginResult{
		Admin:        domain.AdminContext{ID: admin.ID, Username: admin.Username},
		SessionToken: token,
		CSRFToken:    csrfToken,
		ExpiresAt:    expiresAt,
	}, nil
}

func (s *AdminService) RefreshSession(ctx context.Context, token string) (string, error) {
	csrfToken, err := security.RandomToken()
	if err != nil {
		return "", err
	}
	if err := s.repository.RefreshAdminSessionCSRF(ctx, security.LookupHash(token, s.secretPepper), security.LookupHash(csrfToken, s.secretPepper)); err != nil {
		return "", err
	}
	return csrfToken, nil
}

func (s *AdminService) Logout(ctx context.Context, token string) error {
	return s.repository.DeleteAdminSession(ctx, security.LookupHash(token, s.secretPepper))
}

func (s *AdminService) AuthenticateSession(ctx context.Context, token string, csrfToken string, validateCSRF bool) (domain.AdminContext, error) {
	admin, err := s.repository.FindAdminSession(ctx, security.LookupHash(token, s.secretPepper))
	if err != nil {
		return domain.AdminContext{}, ErrUnauthorizedSession
	}
	if validateCSRF && (csrfToken == "" || security.LookupHash(csrfToken, s.secretPepper) != admin.CSRFHash) {
		return domain.AdminContext{}, ErrInvalidCSRFToken
	}
	return admin, nil
}

func (s *AdminService) WriteAudit(ctx context.Context, entry domain.AdminAuditEntry) error {
	return s.repository.WriteAudit(ctx, entry)
}

func (s *AdminService) LoadOverview(ctx context.Context, now time.Time) (domain.OverviewResponse, error) {
	today := StartOfLocalDay(now)
	trendStart := today.AddDate(0, 0, -6)
	counts, err := s.repository.LoadOverviewCounts(ctx, today)
	if err != nil {
		return domain.OverviewResponse{}, err
	}
	fileInventory, err := s.repository.ListFileInventory(ctx)
	if err != nil {
		return domain.OverviewResponse{}, err
	}
	redemptionCounts, err := s.repository.LoadRedemptionTrendCounts(ctx, trendStart)
	if err != nil {
		return domain.OverviewResponse{}, err
	}
	downloadCounts, err := s.repository.LoadSuccessfulDownloadTrendCounts(ctx, trendStart)
	if err != nil {
		return domain.OverviewResponse{}, err
	}
	return BuildOverviewResponse(now, counts, fileInventory, redemptionCounts, downloadCounts), nil
}

func (s *AdminService) LoadLogs(ctx context.Context, params domain.LogsListParams) (domain.LogsResponse, error) {
	switch params.Type {
	case "downloads":
		total, err := s.repository.CountDownloadLogs(ctx, params.Query)
		if err != nil {
			return domain.LogsResponse{}, err
		}
		params.Page = ClampPage(params.Page, total, params.PageSize)
		items, err := s.repository.ListDownloadLogs(ctx, params)
		if err != nil {
			return domain.LogsResponse{}, err
		}
		return buildLogsResponse(params, total, items), nil
	case "admin":
		total, err := s.repository.CountAdminAuditLogs(ctx, params.Query)
		if err != nil {
			return domain.LogsResponse{}, err
		}
		params.Page = ClampPage(params.Page, total, params.PageSize)
		items, err := s.repository.ListAdminAuditLogs(ctx, params)
		if err != nil {
			return domain.LogsResponse{}, err
		}
		return buildLogsResponse(params, total, items), nil
	default:
		total, err := s.repository.CountRedemptionLogs(ctx, params.Query)
		if err != nil {
			return domain.LogsResponse{}, err
		}
		params.Page = ClampPage(params.Page, total, params.PageSize)
		items, err := s.repository.ListRedemptionLogs(ctx, params)
		if err != nil {
			return domain.LogsResponse{}, err
		}
		return buildLogsResponse(params, total, items), nil
	}
}

func buildLogsResponse(params domain.LogsListParams, total int, items any) domain.LogsResponse {
	return domain.LogsResponse{
		Type:       params.Type,
		Items:      items,
		Page:       params.Page,
		PageSize:   params.PageSize,
		TotalItems: total,
		TotalPages: TotalPages(total, params.PageSize),
	}
}

func BuildOverviewResponse(now time.Time, counts domain.OverviewCounts, fileInventory []domain.FileInventoryStat, redemptions map[string]int, downloads map[string]int) domain.OverviewResponse {
	return domain.OverviewResponse{
		TotalCardKeys:     counts.TotalCardKeys,
		ActiveCardKeys:    counts.ActiveCardKeys,
		RedeemedCardKeys:  counts.RedeemedCardKeys,
		ExpiredCardKeys:   counts.ExpiredCardKeys,
		TodaysRedemptions: counts.TodaysRedemptions,
		TodaysDownloads:   counts.TodaysDownloads,
		FileInventory:     fileInventory,
		CardKeyStatus:     BuildCardKeyStatusDistribution(counts.ActiveCardKeys, counts.RedeemedCardKeys, counts.ExpiredCardKeys),
		DeliveryTrend:     BuildDeliveryTrendDays(now, redemptions, downloads),
	}
}

func StartOfLocalDay(now time.Time) time.Time {
	return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
}

func BuildCardKeyStatusDistribution(active int, redeemed int, expired int) domain.CardKeyStatusDistribution {
	total := active + redeemed + expired
	return domain.CardKeyStatusDistribution{
		Active:          active,
		Redeemed:        redeemed,
		Expired:         expired,
		Total:           total,
		ActivePercent:   Percent(active, total),
		RedeemedPercent: Percent(redeemed, total),
		ExpiredPercent:  Percent(expired, total),
	}
}

func Percent(value int, total int) int {
	if total <= 0 {
		return 0
	}
	return int(math.Round(float64(value) / float64(total) * 100))
}

func StartOfUTCDay(value time.Time) time.Time {
	year, month, day := value.UTC().Date()
	return time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
}

func BuildDeliveryTrendDays(now time.Time, redemptions map[string]int, downloads map[string]int) []domain.DeliveryTrendDay {
	today := StartOfUTCDay(now)
	buckets := make([]domain.DeliveryTrendDay, 0, 7)
	for index := 6; index >= 0; index-- {
		day := today.AddDate(0, 0, -index)
		key := day.Format("2006-01-02")
		buckets = append(buckets, domain.DeliveryTrendDay{
			DateKey:     key,
			Label:       key[5:],
			Redemptions: redemptions[key],
			Downloads:   downloads[key],
		})
	}
	return buckets
}

func TotalPages(totalItems int, pageSize int) int {
	if pageSize < 1 {
		pageSize = 10
	}
	pages := (totalItems + pageSize - 1) / pageSize
	if pages < 1 {
		return 1
	}
	return pages
}

func ClampPage(page int, totalItems int, pageSize int) int {
	pages := TotalPages(totalItems, pageSize)
	if page < 1 {
		return 1
	}
	if page > pages {
		return pages
	}
	return page
}
