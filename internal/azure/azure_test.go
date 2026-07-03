package azure

import (
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"strings"
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

func TestSubscriptions(t *testing.T) {
	t.Run("all entries in file order with default marked", func(t *testing.T) {
		dir := withProfile(t, "azureProfile_default.json")
		got := Subscriptions(envFunc(map[string]string{"AZURE_CONFIG_DIR": dir}), "/nonexistent-home")
		want := []Subscription{
			{Name: "dev-subscription", ID: "0000-aaaa", State: "Enabled", IsDefault: false},
			{Name: "prod-subscription", ID: "1111-bbbb", State: "Enabled", IsDefault: true},
		}
		if !reflect.DeepEqual(got, want) {
			t.Errorf("Subscriptions() = %v, want %v", got, want)
		}
	})

	t.Run("BOM fixture parses", func(t *testing.T) {
		dir := withProfile(t, "azureProfile_bom.json")
		if got := Subscriptions(envFunc(map[string]string{"AZURE_CONFIG_DIR": dir}), "/h"); len(got) == 0 {
			t.Error("Subscriptions() empty, want entries from BOM fixture")
		}
	})

	t.Run("broken and missing degrade to empty", func(t *testing.T) {
		dir := withProfile(t, "azureProfile_broken.json")
		if got := Subscriptions(envFunc(map[string]string{"AZURE_CONFIG_DIR": dir}), "/h"); got != nil {
			t.Errorf("Subscriptions() = %v, want nil for broken JSON", got)
		}
		if got := Subscriptions(envFunc(map[string]string{"AZURE_CONFIG_DIR": t.TempDir()}), "/h"); got != nil {
			t.Errorf("Subscriptions() = %v, want nil for missing file", got)
		}
	})
}

func TestUse(t *testing.T) {
	lookupFor := func(dir string) LookupEnv {
		return envFunc(map[string]string{"AZURE_CONFIG_DIR": dir})
	}

	t.Run("switch by name flips the flags and keeps unknown fields", func(t *testing.T) {
		dir := withProfile(t, "azureProfile_dupnames.json")
		if err := Use(lookupFor(dir), "/h", "real-subscription"); err != nil {
			t.Fatalf("Use: %v", err)
		}
		subs := Subscriptions(lookupFor(dir), "/h")
		for _, s := range subs {
			if s.IsDefault != (s.ID == "cccc-3333") {
				t.Errorf("isDefault wrong for %s: %v", s.ID, s.IsDefault)
			}
		}
		data, _ := os.ReadFile(filepath.Join(dir, "azureProfile.json"))
		if !strings.Contains(string(data), "keep-me-i-am-an-unknown-field") {
			t.Errorf("unknown top-level field lost in round-trip:\n%s", data)
		}
	})

	t.Run("switch by id resolves duplicate names", func(t *testing.T) {
		dir := withProfile(t, "azureProfile_dupnames.json")
		if err := Use(lookupFor(dir), "/h", "bbbb-2222"); err != nil {
			t.Fatalf("Use: %v", err)
		}
		if got := Read(lookupFor(dir), "/h"); got != "N/A(tenant level account)" {
			t.Errorf("Read after Use = %q", got)
		}
		for _, s := range Subscriptions(lookupFor(dir), "/h") {
			if s.IsDefault != (s.ID == "bbbb-2222") {
				t.Errorf("isDefault wrong for %s", s.ID)
			}
		}
	})

	t.Run("ambiguous name requires the id", func(t *testing.T) {
		dir := withProfile(t, "azureProfile_dupnames.json")
		orig, _ := os.ReadFile(filepath.Join(dir, "azureProfile.json"))

		err := Use(lookupFor(dir), "/h", "N/A(tenant level account)")
		var ambiguous *AmbiguousAccountError
		if !errors.As(err, &ambiguous) {
			t.Fatalf("err = %v, want AmbiguousAccountError", err)
		}
		if len(ambiguous.Matches) != 2 {
			t.Errorf("matches = %v, want both duplicates", ambiguous.Matches)
		}
		if data, _ := os.ReadFile(filepath.Join(dir, "azureProfile.json")); string(data) != string(orig) {
			t.Error("file must stay byte-identical on an ambiguity error")
		}
	})

	t.Run("unknown account writes nothing", func(t *testing.T) {
		dir := withProfile(t, "azureProfile_default.json")
		orig, _ := os.ReadFile(filepath.Join(dir, "azureProfile.json"))

		err := Use(lookupFor(dir), "/h", "nope")
		var unknown *UnknownAccountError
		if !errors.As(err, &unknown) {
			t.Fatalf("err = %v, want UnknownAccountError", err)
		}
		if data, _ := os.ReadFile(filepath.Join(dir, "azureProfile.json")); string(data) != string(orig) {
			t.Error("file must stay byte-identical on an unknown error")
		}
	})

	t.Run("BOM is preserved and file stays readable", func(t *testing.T) {
		dir := withProfile(t, "azureProfile_bom.json")
		subs := Subscriptions(lookupFor(dir), "/h")
		if len(subs) == 0 {
			t.Fatal("BOM fixture should have subscriptions")
		}
		if err := Use(lookupFor(dir), "/h", subs[0].ID); err != nil {
			t.Fatalf("Use: %v", err)
		}
		data, _ := os.ReadFile(filepath.Join(dir, "azureProfile.json"))
		if len(data) < 3 || data[0] != 0xEF || data[1] != 0xBB || data[2] != 0xBF {
			t.Error("BOM lost after rewrite")
		}
		if got := Read(lookupFor(dir), "/h"); got != subs[0].Name {
			t.Errorf("Read after Use = %q, want %q", got, subs[0].Name)
		}
	})

	t.Run("broken and missing refuse the write", func(t *testing.T) {
		dir := withProfile(t, "azureProfile_broken.json")
		orig, _ := os.ReadFile(filepath.Join(dir, "azureProfile.json"))
		if err := Use(lookupFor(dir), "/h", "x"); err == nil {
			t.Fatal("Use must refuse an unparsable file")
		}
		if data, _ := os.ReadFile(filepath.Join(dir, "azureProfile.json")); string(data) != string(orig) {
			t.Error("broken file must stay byte-identical")
		}
		if err := Use(lookupFor(t.TempDir()), "/h", "x"); err == nil {
			t.Fatal("Use must refuse a missing file")
		}
	})
}

func TestCheck(t *testing.T) {
	t.Run("broken file yields one warning naming the path", func(t *testing.T) {
		dir := withProfile(t, "azureProfile_broken.json")
		got := Check(envFunc(map[string]string{"AZURE_CONFIG_DIR": dir}), "/h")
		if len(got) != 1 || !strings.Contains(got[0], "azureProfile.json") {
			t.Errorf("Check() = %v, want one warning naming the file", got)
		}
	})
	t.Run("healthy and BOM files are quiet", func(t *testing.T) {
		for _, f := range []string{"azureProfile_default.json", "azureProfile_bom.json"} {
			dir := withProfile(t, f)
			if got := Check(envFunc(map[string]string{"AZURE_CONFIG_DIR": dir}), "/h"); got != nil {
				t.Errorf("%s: Check() = %v, want nil", f, got)
			}
		}
	})
	t.Run("missing file is normal, no warning", func(t *testing.T) {
		if got := Check(envFunc(map[string]string{"AZURE_CONFIG_DIR": t.TempDir()}), "/h"); got != nil {
			t.Errorf("Check() = %v, want nil", got)
		}
	})
}
