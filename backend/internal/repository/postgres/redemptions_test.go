package postgres

import (
	"strings"
	"testing"
)

func TestExpireActiveCardKeySQLReleasesReservedFiles(t *testing.T) {
	query := expireActiveCardKeyAndReleaseFilesQuery()
	for _, want := range []string{
		"UPDATE goods_files",
		"status = 'AVAILABLE'",
		"reserved_by_card_key_id = NULL",
		"reserved_at = NULL",
		"WHERE reserved_by_card_key_id = $1",
		"UPDATE card_keys",
		"status = 'EXPIRED'",
		"WHERE id = $1 AND status = 'ACTIVE'",
	} {
		if !strings.Contains(query, want) {
			t.Fatalf("expire card query missing %q:\n%s", want, query)
		}
	}
}
