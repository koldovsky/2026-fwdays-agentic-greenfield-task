package azure

import (
	"os"
	"path/filepath"
	"testing"
)

func envFunc(m map[string]string) LookupEnv {
	return func(k string) (string, bool) {
		v, ok := m[k]
		return v, ok
	}
}

// withProfile copies a fixture into a temp AZURE_CONFIG_DIR and returns that dir.
func withProfile(t *testing.T, fixture string) string {
	t.Helper()
	dir := t.TempDir()
	src, err := os.ReadFile(filepath.Join("..", "..", "testdata", fixture))
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "azureProfile.json"), src, 0o644); err != nil {
		t.Fatal(err)
	}
	return dir
}

func TestRead(t *testing.T) {
	tests := []struct {
		name    string
		fixture string
		want    string
	}{
		{"default subscription", "azureProfile_default.json", "prod-subscription"},
		{"UTF-8 BOM is stripped", "azureProfile_bom.json", "prod-subscription"},
		{"no default subscription", "azureProfile_no_default.json", ""},
		{"broken JSON", "azureProfile_broken.json", ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dir := withProfile(t, tt.fixture)
			got := Read(envFunc(map[string]string{"AZURE_CONFIG_DIR": dir}), "/nonexistent-home")
			if got != tt.want {
				t.Fatalf("Read() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestReadMissingFile(t *testing.T) {
	got := Read(envFunc(map[string]string{"AZURE_CONFIG_DIR": t.TempDir()}), "/nonexistent-home")
	if got != "" {
		t.Fatalf("Read() = %q, want empty", got)
	}
}

func TestProviderInterface(t *testing.T) {
	p := New()
	if p.Key() != "azure" {
		t.Errorf("Key() = %q, want azure", p.Key())
	}
	if p.Label(false) != "az:" {
		t.Errorf("Label(ascii) = %q, want az:", p.Label(false))
	}

	dir := withProfile(t, "azureProfile_default.json")
	env := envFunc(map[string]string{"AZURE_CONFIG_DIR": dir})
	if !p.Present(env, "/nonexistent") {
		t.Error("Present() should be true when azureProfile.json exists")
	}
	if r := p.Read(env, "/nonexistent"); !r.OK || r.Text != "prod-subscription" {
		t.Errorf("Read() = %q/%v, want prod-subscription/true", r.Text, r.OK)
	}

	// No profile -> not present, empty reading.
	empty := envFunc(map[string]string{"AZURE_CONFIG_DIR": t.TempDir()})
	if p.Present(empty, "/nonexistent") {
		t.Error("Present() should be false with no profile")
	}
	if r := p.Read(empty, "/nonexistent"); r.OK {
		t.Errorf("Read() = %q/%v, want empty/false", r.Text, r.OK)
	}
}

func TestReadDefaultPath(t *testing.T) {
	home := t.TempDir()
	azDir := filepath.Join(home, ".azure")
	if err := os.MkdirAll(azDir, 0o755); err != nil {
		t.Fatal(err)
	}
	src, err := os.ReadFile(filepath.Join("..", "..", "testdata", "azureProfile_default.json"))
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(azDir, "azureProfile.json"), src, 0o644); err != nil {
		t.Fatal(err)
	}
	got := Read(envFunc(map[string]string{}), home)
	if got != "prod-subscription" {
		t.Fatalf("Read() = %q, want prod-subscription", got)
	}
}
