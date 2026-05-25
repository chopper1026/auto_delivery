package storage

import (
	"archive/zip"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"
	"mime/multipart"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

const (
	MaxUploadFiles       = 200
	MaxUploadBytes int64 = 100 * 1024 * 1024
	MaxSingleBytes int64 = 5 * 1024 * 1024
)

var unsafeNameChars = regexp.MustCompile(`[^A-Za-z0-9._\-\p{Han}]`)

type SavedFile struct {
	OriginalName string
	StoredName   string
	StoragePath  string
	SizeBytes    int64
	MimeType     string
	SHA256       string
}

type ZipEntry struct {
	Path      string
	EntryName string
}

func Ensure(root string) error {
	for _, dir := range []string{"uploads", "zips", "tmp"} {
		if err := os.MkdirAll(filepath.Join(root, dir), 0o755); err != nil {
			return err
		}
	}
	return nil
}

func SanitizeEntryName(name string) string {
	base := filepath.Base(strings.TrimSpace(name))
	if base == "." || base == "/" || base == "" {
		return "file"
	}
	base = unsafeNameChars.ReplaceAllString(base, "_")
	base = strings.Trim(base, "._- ")
	if base == "" {
		return "file"
	}
	return base
}

func BuildZipFilename(goodsName string, fileCount int, at time.Time) string {
	if fileCount < 0 {
		fileCount = 0
	}
	return SanitizeEntryName(goodsName) + "-" + strconv.Itoa(fileCount) + "-" + at.Format("200601021504") + ".zip"
}

func AttachmentDisposition(filename string) string {
	name := SanitizeEntryName(filename)
	return `attachment; filename="` + asciiFilenameFallback(name) + `"; filename*=UTF-8''` + url.PathEscape(name)
}

func asciiFilenameFallback(filename string) string {
	var b strings.Builder
	for _, r := range filename {
		if (r >= 'A' && r <= 'Z') || (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '.' || r == '_' || r == '-' {
			b.WriteRune(r)
		}
	}
	value := strings.Trim(b.String(), "._-")
	if value == "" {
		return "download.zip"
	}
	return value
}

func IsAllowedInventoryFile(name string, mimeType string) bool {
	return strings.EqualFold(filepath.Ext(name), ".json") ||
		mimeType == "application/json" ||
		mimeType == "text/json"
}

func SaveInventoryFile(root string, goodsID string, header *multipart.FileHeader) (SavedFile, error) {
	if header.Size > MaxSingleBytes {
		return SavedFile{}, errors.New("file is too large")
	}
	if !IsAllowedInventoryFile(header.Filename, header.Header.Get("Content-Type")) {
		return SavedFile{}, errors.New("only JSON files are allowed")
	}
	src, err := header.Open()
	if err != nil {
		return SavedFile{}, err
	}
	defer src.Close()

	dir := filepath.Join(root, "uploads", goodsID)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return SavedFile{}, err
	}

	storedName := uuid.NewString() + "_" + SanitizeEntryName(header.Filename)
	dstPath := filepath.Join(dir, storedName)
	dst, err := os.Create(dstPath)
	if err != nil {
		return SavedFile{}, err
	}
	defer dst.Close()

	hash := sha256.New()
	written, err := io.Copy(io.MultiWriter(dst, hash), src)
	if err != nil {
		_ = os.Remove(dstPath)
		return SavedFile{}, err
	}

	return SavedFile{
		OriginalName: header.Filename,
		StoredName:   storedName,
		StoragePath:  dstPath,
		SizeBytes:    written,
		MimeType:     header.Header.Get("Content-Type"),
		SHA256:       hex.EncodeToString(hash.Sum(nil)),
	}, nil
}

func RemoveSavedFiles(files []SavedFile) {
	for _, file := range files {
		if file.StoragePath != "" {
			_ = os.Remove(file.StoragePath)
		}
	}
}

func RemovePath(path string) error {
	if path != "" {
		return os.Remove(path)
	}
	return nil
}

func CreateZipFromFiles(entries []ZipEntry, outputPath string) (int64, error) {
	if err := os.MkdirAll(filepath.Dir(outputPath), 0o755); err != nil {
		return 0, err
	}
	tmpPath := outputPath + ".tmp"
	dst, err := os.Create(tmpPath)
	if err != nil {
		return 0, err
	}

	zw := zip.NewWriter(dst)
	seen := map[string]int{}
	for _, entry := range entries {
		if err := addZipFile(zw, entry, seen); err != nil {
			_ = zw.Close()
			_ = dst.Close()
			_ = os.Remove(tmpPath)
			return 0, err
		}
	}
	if err := zw.Close(); err != nil {
		_ = dst.Close()
		_ = os.Remove(tmpPath)
		return 0, err
	}
	if err := dst.Close(); err != nil {
		_ = os.Remove(tmpPath)
		return 0, err
	}
	if err := os.Rename(tmpPath, outputPath); err != nil {
		_ = os.Remove(tmpPath)
		return 0, err
	}
	info, err := os.Stat(outputPath)
	if err != nil {
		return 0, err
	}
	return info.Size(), nil
}

func WriteZip(w io.Writer, entries []ZipEntry, extra map[string]string) error {
	zw := zip.NewWriter(w)
	seen := map[string]int{}
	for _, entry := range entries {
		if err := addZipFile(zw, entry, seen); err != nil {
			_ = zw.Close()
			return err
		}
	}
	for name, body := range extra {
		writer, err := zw.Create(SanitizeEntryName(name))
		if err != nil {
			_ = zw.Close()
			return err
		}
		if _, err := writer.Write([]byte(body)); err != nil {
			_ = zw.Close()
			return err
		}
	}
	return zw.Close()
}

func WriteZipWithEntryPaths(w io.Writer, entries []ZipEntry, extra map[string]string) error {
	zw := zip.NewWriter(w)
	seen := map[string]int{}
	for _, entry := range entries {
		if err := addZipFileWithEntryPath(zw, entry, seen); err != nil {
			_ = zw.Close()
			return err
		}
	}
	for name, body := range extra {
		writer, err := zw.Create(SanitizeEntryPath(name))
		if err != nil {
			_ = zw.Close()
			return err
		}
		if _, err := writer.Write([]byte(body)); err != nil {
			_ = zw.Close()
			return err
		}
	}
	return zw.Close()
}

func SanitizeEntryPath(name string) string {
	normalized := strings.ReplaceAll(strings.TrimSpace(name), "\\", "/")
	parts := []string{}
	for _, part := range strings.Split(normalized, "/") {
		part = strings.TrimSpace(part)
		if part == "" || part == "." || part == ".." {
			continue
		}
		parts = append(parts, SanitizeEntryName(part))
	}
	if len(parts) == 0 {
		return "file"
	}
	return strings.Join(parts, "/")
}

func UniqueZipEntryName(name string, seen map[string]int) string {
	return uniqueZipName(SanitizeEntryPath(name), seen)
}

func addZipFile(zw *zip.Writer, entry ZipEntry, seen map[string]int) error {
	src, err := os.Open(entry.Path)
	if err != nil {
		return err
	}
	defer src.Close()
	name := uniqueZipName(SanitizeEntryName(entry.EntryName), seen)
	writer, err := zw.Create(name)
	if err != nil {
		return err
	}
	_, err = io.Copy(writer, src)
	return err
}

func addZipFileWithEntryPath(zw *zip.Writer, entry ZipEntry, seen map[string]int) error {
	src, err := os.Open(entry.Path)
	if err != nil {
		return err
	}
	defer src.Close()
	name := UniqueZipEntryName(entry.EntryName, seen)
	writer, err := zw.Create(name)
	if err != nil {
		return err
	}
	_, err = io.Copy(writer, src)
	return err
}

func uniqueZipName(name string, seen map[string]int) string {
	count := seen[name]
	seen[name] = count + 1
	if count == 0 {
		return name
	}
	ext := filepath.Ext(name)
	stem := strings.TrimSuffix(name, ext)
	return stem + "-" + strconv.Itoa(count+1) + ext
}
