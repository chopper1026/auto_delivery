package storage

import (
	"os"
	"path/filepath"
	"testing"
)

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

func TestRemoveSavedFilesDeletesExistingPaths(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "uploaded.json")
	if err := os.WriteFile(path, []byte("{}"), 0o644); err != nil {
		t.Fatal(err)
	}

	RemoveSavedFiles([]SavedFile{{StoragePath: path}})

	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatalf("expected saved file to be removed, stat err = %v", err)
	}
}

func TestRemovePathIgnoresEmptyPath(t *testing.T) {
	RemovePath("")
}
