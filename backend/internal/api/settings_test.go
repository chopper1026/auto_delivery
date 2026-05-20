package api

import "testing"

func TestNormalizeServiceBaseURL(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    string
		wantErr bool
	}{
		{name: "trims trailing slash", input: " https://example.com/app/ ", want: "https://example.com/app"},
		{name: "keeps host root", input: "http://localhost:18080/", want: "http://localhost:18080"},
		{name: "drops query and fragment", input: "https://example.com/path/?a=1#x", want: "https://example.com/path"},
		{name: "rejects missing scheme", input: "example.com", wantErr: true},
		{name: "rejects unsupported scheme", input: "ftp://example.com", wantErr: true},
		{name: "rejects empty input", input: " ", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := normalizeServiceBaseURL(tt.input)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("normalizeServiceBaseURL(%q) error = nil, want error", tt.input)
				}
				return
			}
			if err != nil {
				t.Fatalf("normalizeServiceBaseURL(%q) error = %v", tt.input, err)
			}
			if got != tt.want {
				t.Fatalf("normalizeServiceBaseURL(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}
