package config

import (
	"errors"
	"time"

	"github.com/caarlos0/env/v11"
)

type Config struct {
	AppEnv             string        `env:"APP_ENV" envDefault:"development"`
	HTTPAddr           string        `env:"HTTP_ADDR" envDefault:":3000"`
	DatabaseURL        string        `env:"DATABASE_URL,required"`
	RedisURL           string        `env:"REDIS_URL" envDefault:"redis://localhost:6379/0"`
	AdminUsername      string        `env:"ADMIN_USERNAME,required"`
	AdminPassword      string        `env:"ADMIN_PASSWORD,required"`
	SecretPepper       string        `env:"SECRET_PEPPER,required"`
	SessionCookieName  string        `env:"SESSION_COOKIE_NAME" envDefault:"auto_delivery_admin"`
	AppBaseURL         string        `env:"APP_BASE_URL" envDefault:"http://localhost:3000"`
	StorageRoot        string        `env:"STORAGE_ROOT" envDefault:"./storage"`
	StaticDir          string        `env:"STATIC_DIR" envDefault:"./frontend/dist"`
	Timezone           string        `env:"TZ" envDefault:"Asia/Shanghai"`
	UploadBodyLimit    int64         `env:"ADMIN_UPLOAD_BODY_LIMIT_BYTES" envDefault:"104857600"`
	TrustedProxyCIDRs  []string      `env:"TRUSTED_PROXY_CIDRS" envSeparator:","`
	ForceSecureCookies bool          `env:"FORCE_SECURE_COOKIES" envDefault:"false"`
	SessionTTL         time.Duration `env:"SESSION_TTL" envDefault:"168h"`
	DownloadClaimTTL   time.Duration `env:"DOWNLOAD_CLAIM_TTL" envDefault:"10m"`
}

func Load() (Config, error) {
	var cfg Config
	if err := env.Parse(&cfg); err != nil {
		return Config{}, err
	}
	if len(cfg.SecretPepper) < 32 {
		return Config{}, errors.New("SECRET_PEPPER must be at least 32 characters")
	}
	if len(cfg.AdminPassword) < 12 {
		return Config{}, errors.New("ADMIN_PASSWORD must be at least 12 characters")
	}
	return cfg, nil
}
