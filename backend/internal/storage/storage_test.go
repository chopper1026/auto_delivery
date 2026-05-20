package storage

import "testing"

func TestSanitizeEntryNameRemovesPathTraversal(t *testing.T) {
	got := SanitizeEntryName("../../secret.json")
	if got != "secret.json" {
		t.Fatalf("SanitizeEntryName() = %q, want secret.json", got)
	}
}

func TestIsAllowedInventoryFileAcceptsJSONOnly(t *testing.T) {
	if !IsAllowedInventoryFile("inventory.json", "") {
		t.Fatal("expected json extension to be allowed")
	}
	if IsAllowedInventoryFile("inventory.txt", "text/plain") {
		t.Fatal("expected txt file to be rejected")
	}
}
