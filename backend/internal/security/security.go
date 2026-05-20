package security

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"golang.org/x/crypto/argon2"
)

const cardAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

var cardKeyPattern = regexp.MustCompile(`^AD-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$`)

func LookupHash(secret string, pepper string) string {
	mac := hmac.New(sha256.New, []byte(pepper))
	mac.Write([]byte(strings.TrimSpace(secret)))
	return hex.EncodeToString(mac.Sum(nil))
}

func NormalizeCardKey(value string) string {
	raw := strings.ToUpper(strings.TrimSpace(value))
	var b strings.Builder
	b.Grow(len(raw))
	for _, r := range raw {
		if r == '-' || r == ' ' || r == '\t' || r == '\n' || r == '\r' {
			continue
		}
		b.WriteRune(r)
	}
	compact := b.String()
	if strings.HasPrefix(compact, "AD") {
		compact = strings.TrimPrefix(compact, "AD")
	}
	if len(compact) != 16 {
		return raw
	}
	return fmt.Sprintf("AD-%s-%s-%s-%s", compact[0:4], compact[4:8], compact[8:12], compact[12:16])
}

func IsCardKey(value string) bool {
	return cardKeyPattern.MatchString(NormalizeCardKey(value))
}

func MaskSecret(secret string) string {
	parts := strings.Split(strings.TrimSpace(secret), "-")
	if len(parts) < 3 {
		return "****"
	}
	for i := 1; i < len(parts)-1; i++ {
		parts[i] = "****"
	}
	return strings.Join(parts, "-")
}

func RandomToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(bytes), nil
}

func GenerateCardKey() (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	out := make([]byte, 16)
	for i, b := range bytes {
		out[i] = cardAlphabet[int(b)%len(cardAlphabet)]
	}
	return fmt.Sprintf("AD-%s-%s-%s-%s", out[0:4], out[4:8], out[8:12], out[12:16]), nil
}

type PasswordParams struct {
	Memory      uint32
	Iterations  uint32
	Parallelism uint8
	SaltLength  uint32
	KeyLength   uint32
}

var DefaultPasswordParams = PasswordParams{
	Memory:      64 * 1024,
	Iterations:  3,
	Parallelism: 2,
	SaltLength:  16,
	KeyLength:   32,
}

func HashPassword(password string) (string, error) {
	return HashPasswordWithParams(password, DefaultPasswordParams)
}

func HashPasswordWithParams(password string, params PasswordParams) (string, error) {
	salt := make([]byte, params.SaltLength)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	hash := argon2.IDKey([]byte(password), salt, params.Iterations, params.Memory, params.Parallelism, params.KeyLength)
	return fmt.Sprintf("$argon2id$v=19$m=%d,t=%d,p=%d$%s$%s",
		params.Memory,
		params.Iterations,
		params.Parallelism,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(hash),
	), nil
}

func VerifyPassword(password string, encoded string) (bool, error) {
	var memory uint32
	var iterations uint32
	var parallelism uint8
	parts := strings.Split(encoded, "$")
	if len(parts) != 6 || parts[1] != "argon2id" || parts[2] != "v=19" {
		return false, errors.New("invalid password hash format")
	}
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &memory, &iterations, &parallelism); err != nil {
		return false, err
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return false, err
	}
	expected, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return false, err
	}
	actual := argon2.IDKey([]byte(password), salt, iterations, memory, parallelism, uint32(len(expected)))
	return subtle.ConstantTimeCompare(actual, expected) == 1, nil
}
