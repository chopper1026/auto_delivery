package service

import (
	"errors"
	"strings"
	"time"
)

func CalculateExpiresAt(option string, now time.Time) (*time.Time, error) {
	var expires time.Time
	switch strings.ToLower(strings.TrimSpace(option)) {
	case "", "3d":
		expires = now.AddDate(0, 0, 3)
	case "never":
		return nil, nil
	case "3m":
		expires = now.Add(3 * time.Minute)
	case "1d":
		expires = now.AddDate(0, 0, 1)
	case "7d":
		expires = now.AddDate(0, 0, 7)
	default:
		return nil, errors.New("invalid expiration")
	}
	return &expires, nil
}
