package security

import (
	"strings"
	"testing"
)

func TestGenerateCardKeyUsesExpectedFormat(t *testing.T) {
	key, err := GenerateCardKey()
	if err != nil {
		t.Fatal(err)
	}
	if !IsCardKey(key) {
		t.Fatalf("generated key %q does not match card key format", key)
	}
}

func TestNormalizeCardKeyFormatsPastedInput(t *testing.T) {
	got := NormalizeCardKey(" ad abcd efgh jklm npqr ")
	want := "AD-ABCD-EFGH-JKLM-NPQR"
	if got != want {
		t.Fatalf("NormalizeCardKey() = %q, want %q", got, want)
	}
}

func TestLookupHashDependsOnPepper(t *testing.T) {
	first := LookupHash("secret", strings.Repeat("a", 32))
	second := LookupHash("secret", strings.Repeat("b", 32))
	if first == second {
		t.Fatal("hash should change when pepper changes")
	}
}

func TestPasswordHashVerifiesOnlyOriginalPassword(t *testing.T) {
	hash, err := HashPasswordWithParams("change-this-password", PasswordParams{
		Memory:      1024,
		Iterations:  1,
		Parallelism: 1,
		SaltLength:  16,
		KeyLength:   32,
	})
	if err != nil {
		t.Fatal(err)
	}
	ok, err := VerifyPassword("change-this-password", hash)
	if err != nil {
		t.Fatal(err)
	}
	if !ok {
		t.Fatal("expected original password to verify")
	}
	ok, err = VerifyPassword("wrong-password", hash)
	if err != nil {
		t.Fatal(err)
	}
	if ok {
		t.Fatal("wrong password verified")
	}
}
