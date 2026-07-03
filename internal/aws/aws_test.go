package aws

import (
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

func fixture(name string) string { return filepath.Join("..", "..", "testdata", name) }

func TestReadDisplayAndProfilePrecedence(t *testing.T) {
	def := fixture("aws_config_default.ini")
	named := fixture("aws_config_named.ini")

	cases := []struct {
		name string
		env  map[string]string
		want string
	}{
		{"AWS_PROFILE wins over AWS_VAULT", map[string]string{"AWS_CONFIG_FILE": def, "AWS_PROFILE": "foo", "AWS_VAULT": "bar"}, "foo"},
		{"AWS_VAULT when no AWS_PROFILE", map[string]string{"AWS_CONFIG_FILE": def, "AWS_VAULT": "bar"}, "bar"},
		{"default profile + region from config", map[string]string{"AWS_CONFIG_FILE": def}, "default/us-east-1"},
		{"named profile region from [profile NAME]", map[string]string{"AWS_CONFIG_FILE": named, "AWS_PROFILE": "prod"}, "prod/eu-west-1"},
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

func TestReadRegionPrecedence(t *testing.T) {
	def := fixture("aws_config_default.ini")
	noRegion := fixture("aws_config_no_region.ini")

	cases := []struct {
		name string
		env  map[string]string
		want string
	}{
		{"AWS_REGION wins", map[string]string{"AWS_CONFIG_FILE": def, "AWS_REGION": "r1", "AWS_DEFAULT_REGION": "r2"}, "default/r1"},
		{"AWS_DEFAULT_REGION next", map[string]string{"AWS_CONFIG_FILE": def, "AWS_DEFAULT_REGION": "r2"}, "default/r2"},
		{"config region last", map[string]string{"AWS_CONFIG_FILE": def}, "default/us-east-1"},
		{"no region anywhere -> profile only", map[string]string{"AWS_CONFIG_FILE": noRegion}, "default"},
	}
	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			if got := New().Read(env(tt.env), "/nonexistent"); got.Text != tt.want {
				t.Fatalf("Read() = %q, want %q", got.Text, tt.want)
			}
		})
	}
}

func TestReadMissingIsEmpty(t *testing.T) {
	// No env signal and no ~/.aws files -> nothing to show.
	got := New().Read(env(nil), t.TempDir())
	if got.OK || got.Text != "" {
		t.Fatalf("Read() = %q/%v, want empty/false", got.Text, got.OK)
	}
}

func TestReadBrokenConfigDegrades(t *testing.T) {
	// A broken config file still exists (present), but yields no region.
	got := New().Read(env(map[string]string{"AWS_CONFIG_FILE": fixture("aws_config_broken.ini")}), "/nonexistent")
	if got.Text != "default" {
		t.Fatalf("Read() = %q, want %q (broken config -> profile only)", got.Text, "default")
	}
}

func TestPresent(t *testing.T) {
	if New().Present(env(nil), t.TempDir()) {
		t.Error("no files and no env should not be present")
	}
	if !New().Present(env(map[string]string{"AWS_CONFIG_FILE": fixture("aws_config_default.ini")}), "/nonexistent") {
		t.Error("existing config file should be present")
	}
	if !New().Present(env(map[string]string{"AWS_REGION": "us-east-1"}), t.TempDir()) {
		t.Error("AWS_REGION env should make it present")
	}
}

func TestKeyAndLabel(t *testing.T) {
	p := New()
	if p.Key() != "aws" {
		t.Errorf("Key() = %q, want aws", p.Key())
	}
	if p.Label(true) != cloud.IconAWS {
		t.Errorf("Label(icons) = %q, want %q", p.Label(true), cloud.IconAWS)
	}
	if p.Label(false) != "aws:" {
		t.Errorf("Label(ascii) = %q, want aws:", p.Label(false))
	}
}

func TestProfiles(t *testing.T) {
	t.Run("config sections with regions, prefix stripped", func(t *testing.T) {
		got := Profiles(env(map[string]string{"AWS_CONFIG_FILE": fixture("aws_config_named.ini")}), t.TempDir())
		want := []Profile{{Name: "default", Region: "us-east-1"}, {Name: "prod", Region: "eu-west-1"}}
		if !reflect.DeepEqual(got, want) {
			t.Errorf("Profiles() = %v, want %v", got, want)
		}
	})

	t.Run("credentials-only profile is appended without secrets", func(t *testing.T) {
		home := t.TempDir()
		if err := os.MkdirAll(filepath.Join(home, ".aws"), 0o755); err != nil {
			t.Fatal(err)
		}
		src, _ := os.ReadFile(fixture("aws_credentials_extra.ini"))
		if err := os.WriteFile(filepath.Join(home, ".aws", "credentials"), src, 0o600); err != nil {
			t.Fatal(err)
		}
		got := Profiles(env(map[string]string{"AWS_CONFIG_FILE": fixture("aws_config_named.ini")}), home)
		want := []Profile{
			{Name: "default", Region: "us-east-1"},
			{Name: "prod", Region: "eu-west-1"},
			{Name: "ci-only"}, // from credentials; no region, no key material
		}
		if !reflect.DeepEqual(got, want) {
			t.Errorf("Profiles() = %v, want %v", got, want)
		}
	})

	t.Run("missing files yield nothing", func(t *testing.T) {
		if got := Profiles(env(map[string]string{"AWS_CONFIG_FILE": fixture("nope.ini")}), t.TempDir()); got != nil {
			t.Errorf("Profiles() = %v, want nil", got)
		}
	})

	t.Run("broken config still yields credentials names", func(t *testing.T) {
		home := t.TempDir()
		if err := os.MkdirAll(filepath.Join(home, ".aws"), 0o755); err != nil {
			t.Fatal(err)
		}
		src, _ := os.ReadFile(fixture("aws_credentials_extra.ini"))
		if err := os.WriteFile(filepath.Join(home, ".aws", "credentials"), src, 0o600); err != nil {
			t.Fatal(err)
		}
		got := Profiles(env(map[string]string{"AWS_CONFIG_FILE": fixture("aws_config_broken.ini")}), home)
		for _, p := range got {
			if p.Name == "ci-only" {
				return
			}
		}
		t.Errorf("Profiles() = %v, want ci-only present", got)
	})
}

func TestCurrentProfile(t *testing.T) {
	if got := CurrentProfile(env(nil)); got != "default" {
		t.Errorf("CurrentProfile() = %q, want default", got)
	}
	if got := CurrentProfile(env(map[string]string{"AWS_PROFILE": "prod"})); got != "prod" {
		t.Errorf("CurrentProfile() = %q, want prod", got)
	}
}
