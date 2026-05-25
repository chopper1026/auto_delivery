package storage

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
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

func TestBuildZipFilenameUsesGoodsNameCountAndMinute(t *testing.T) {
	got := BuildZipFilename("CPA 文件包", 2, time.Date(2026, 5, 25, 15, 30, 59, 0, time.UTC))
	want := "CPA_文件包-2-202605251530.zip"
	if got != want {
		t.Fatalf("BuildZipFilename() = %q, want %q", got, want)
	}
}

func TestAttachmentDispositionIncludesUTF8Filename(t *testing.T) {
	got := AttachmentDisposition("CPA_文件包-2-202605251530.zip")
	if !strings.Contains(got, `filename="CPA_-2-202605251530.zip"`) {
		t.Fatalf("AttachmentDisposition() fallback = %q", got)
	}
	if !strings.Contains(got, "filename*=UTF-8''CPA_%E6%96%87%E4%BB%B6%E5%8C%85-2-202605251530.zip") {
		t.Fatalf("AttachmentDisposition() utf8 filename = %q", got)
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
