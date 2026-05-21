package migrations

import (
	"strings"
	"testing"
)

func TestInitialSettingsUseDefaultDeliveryMessageTemplate(t *testing.T) {
	const want = "卡密：{{cardKey}}\\n兑换地址：{{redeemUrl}}\\n创建时间：{{createdAt}}\\n过期时间：{{expiresAt}}\\n\\n注意事项：卡密仅可兑换一次，请在有效期内及时兑换，兑换后立刻保存，过期或自身未保存导致的损失自负。"

	sqlBytes, err := FS.ReadFile("001_init.sql")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(sqlBytes), want) {
		t.Fatalf("001_init.sql does not contain default delivery message template %q", want)
	}
}

func TestExistingDefaultSettingsAreMigratedWithoutOverwritingCustomTemplates(t *testing.T) {
	const oldDefault = "兑换地址：{{redeemUrl}}\\n卡密：{{cardKey}}\\n创建时间：{{createdAt}}\\n到期时间：{{expiresAt}}"
	const newDefault = "卡密：{{cardKey}}\\n兑换地址：{{redeemUrl}}\\n创建时间：{{createdAt}}\\n过期时间：{{expiresAt}}"

	sqlBytes, err := FS.ReadFile("002_update_default_delivery_message_template.sql")
	if err != nil {
		t.Fatal(err)
	}
	sqlText := string(sqlBytes)
	for _, want := range []string{oldDefault, newDefault, "WHERE key = 'card_key_delivery_message_template'", "AND value ="} {
		if !strings.Contains(sqlText, want) {
			t.Fatalf("002_update_default_delivery_message_template.sql does not contain %q", want)
		}
	}
}
