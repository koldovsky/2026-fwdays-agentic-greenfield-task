package gcp

import (
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"testing"

	"omnictx/internal/cloud"
)

func env(m map[string]string) LookupEnv {
	return func(k string) (string, bool) {
		v, ok := m[k]
		return v, ok
	}
}

func gcloudDirFixture() string { return filepath.Join("..", "..", "testdata", "gcloud") }

func TestReadProjectPrecedence(t *testing.T) {
	dir := gcloudDirFixture()

	cases := []struct {
		name string
		env  map[string]string
		want string
	}{
		{"CLOUDSDK_CORE_PROJECT wins", map[string]string{"CLOUDSDK_CONFIG": dir, "CLOUDSDK_CORE_PROJECT": "env-proj", "GOOGLE_CLOUD_PROJECT": "g-proj"}, "env-proj"},
		{"GOOGLE_CLOUD_PROJECT next", map[string]string{"CLOUDSDK_CONFIG": dir, "GOOGLE_CLOUD_PROJECT": "g-proj"}, "g-proj"},
		{"active_config file -> work config", map[string]string{"CLOUDSDK_CONFIG": dir}, "my-work-project"},
		{"explicit active config name -> default", map[string]string{"CLOUDSDK_CONFIG": dir, "CLOUDSDK_ACTIVE_CONFIG_NAME": "default"}, "my-default-project"},
	}
	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			got := New().Read(env(tt.env), "/nonexistent")
			if !got.OK || got.Text != tt.want {
				t.Fatalf("Read() = %q/%v, want %q", got.Text, got.OK, tt.want)
			}
		})
	}
}

func TestReadNoProjectIsEmpty(t *testing.T) {
	got := New().Read(env(map[string]string{
		"CLOUDSDK_CONFIG":             gcloudDirFixture(),
		"CLOUDSDK_ACTIVE_CONFIG_NAME": "noproject",
	}), "/nonexistent")
	if got.OK || got.Text != "" {
		t.Fatalf("Read() = %q/%v, want empty/false", got.Text, got.OK)
	}
}

func TestReadMissingIsEmpty(t *testing.T) {
	got := New().Read(env(nil), t.TempDir())
	if got.OK || got.Text != "" {
		t.Fatalf("Read() = %q/%v, want empty/false", got.Text, got.OK)
	}
}

func TestPresent(t *testing.T) {
	if New().Present(env(nil), t.TempDir()) {
		t.Error("no gcloud dir and no env should not be present")
	}
	if !New().Present(env(map[string]string{"CLOUDSDK_CONFIG": gcloudDirFixture()}), "/nonexistent") {
		t.Error("existing gcloud dir should be present")
	}
	if !New().Present(env(map[string]string{"GOOGLE_CLOUD_PROJECT": "p"}), t.TempDir()) {
		t.Error("GOOGLE_CLOUD_PROJECT env should make it present")
	}
}

func TestKeyAndLabel(t *testing.T) {
	p := New()
	if p.Key() != "gcp" {
		t.Errorf("Key() = %q, want gcp", p.Key())
	}
	if p.Label(true) != cloud.IconGCP {
		t.Errorf("Label(icons) = %q, want %q", p.Label(true), cloud.IconGCP)
	}
	if p.Label(false) != "gcp:" {
		t.Errorf("Label(ascii) = %q, want gcp:", p.Label(false))
	}
}

func TestConfigurations(t *testing.T) {
	t.Run("rows from fixture dir in name order", func(t *testing.T) {
		got := Configurations(env(map[string]string{"CLOUDSDK_CONFIG": gcloudDirFixture()}), "/nonexistent-home")
		want := []Configuration{
			{Name: "default", Account: "me@example.com", Project: "my-default-project"},
			{Name: "noproject", Account: "me@example.com"},
			{Name: "work", Project: "my-work-project"},
		}
		if !reflect.DeepEqual(got, want) {
			t.Errorf("Configurations() = %v, want %v", got, want)
		}
	})

	t.Run("missing dir yields nothing", func(t *testing.T) {
		if got := Configurations(env(nil), t.TempDir()); got != nil {
			t.Errorf("Configurations() = %v, want nil", got)
		}
	})
}

func TestCurrentConfiguration(t *testing.T) {
	dir := gcloudDirFixture()
	if got := CurrentConfiguration(env(map[string]string{"CLOUDSDK_CONFIG": dir}), "/h"); got != "work" {
		t.Errorf("CurrentConfiguration() = %q, want work (from active_config)", got)
	}
	if got := CurrentConfiguration(env(map[string]string{"CLOUDSDK_CONFIG": dir, "CLOUDSDK_ACTIVE_CONFIG_NAME": "default"}), "/h"); got != "default" {
		t.Errorf("CurrentConfiguration() = %q, want default (env wins)", got)
	}
}

// useFixture copies the gcloud fixture tree into a temp dir so Use can write.
func useFixture(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dir, "configurations"), 0o755); err != nil {
		t.Fatal(err)
	}
	for _, n := range []string{"config_default", "config_work"} {
		src, err := os.ReadFile(filepath.Join(gcloudDirFixture(), "configurations", n))
		if err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(dir, "configurations", n), src, 0o644); err != nil {
			t.Fatal(err)
		}
	}
	if err := os.WriteFile(filepath.Join(dir, "active_config"), []byte("default"), 0o644); err != nil {
		t.Fatal(err)
	}
	return dir
}

func TestUse(t *testing.T) {
	t.Run("activates an existing configuration", func(t *testing.T) {
		dir := useFixture(t)
		lookup := env(map[string]string{"CLOUDSDK_CONFIG": dir})

		if err := Use(lookup, "/nonexistent-home", "work"); err != nil {
			t.Fatalf("Use: %v", err)
		}
		data, _ := os.ReadFile(filepath.Join(dir, "active_config"))
		if string(data) != "work" {
			t.Errorf("active_config = %q, want %q", data, "work")
		}
		if got := CurrentConfiguration(lookup, "/h"); got != "work" {
			t.Errorf("CurrentConfiguration after Use = %q, want work", got)
		}
	})

	t.Run("unknown configuration writes nothing", func(t *testing.T) {
		dir := useFixture(t)
		lookup := env(map[string]string{"CLOUDSDK_CONFIG": dir})

		err := Use(lookup, "/nonexistent-home", "prod")
		var unknown *UnknownConfigError
		if !errors.As(err, &unknown) {
			t.Fatalf("err = %v, want UnknownConfigError", err)
		}
		if len(unknown.Available) != 2 {
			t.Errorf("available = %v, want the two fixture names", unknown.Available)
		}
		data, _ := os.ReadFile(filepath.Join(dir, "active_config"))
		if string(data) != "default" {
			t.Errorf("active_config modified on error: %q", data)
		}
	})

	t.Run("missing configurations dir is an unknown error", func(t *testing.T) {
		err := Use(env(map[string]string{"CLOUDSDK_CONFIG": t.TempDir()}), "/h", "work")
		var unknown *UnknownConfigError
		if !errors.As(err, &unknown) {
			t.Fatalf("err = %v, want UnknownConfigError", err)
		}
	})
}
