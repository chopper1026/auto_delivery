package domain

import "time"

type CardKeyStatus string

const (
	CardKeyActive   CardKeyStatus = "ACTIVE"
	CardKeyRedeemed CardKeyStatus = "REDEEMED"
	CardKeyExpired  CardKeyStatus = "EXPIRED"
	CardKeyDeleted  CardKeyStatus = "DELETED"
)

type GeneratedCardKey struct {
	ID              string
	PlaintextKey    string
	KeyMask         string
	DeliveryMessage string
	ExpiresAt       *time.Time
	CreatedAt       time.Time
}
