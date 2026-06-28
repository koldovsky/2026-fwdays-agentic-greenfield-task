package config

import (
	"path/filepath"
	"reflect"
	"testing"
)

func envFunc(m map[string]string) LookupEnv {
	return func(k string) (string, bool) {
		v, ok := m[k]
		return v, ok
	}
}

func strp(s string) *string { return &s }

func fixturePath(name string) string {
	return filepath.Join("testdata", name)
}

func TestResolveDefaults(t *testing.T) {
	// No flags, no env, no config at /home -> built-ins.
	cfg, _ := Resolve(Flags{}, envFunc(nil), "/home")
	want := Defaults()
	if !reflect.DeepEqual(cfg, want) {
		t.Fatalf("Resolve() = %+v, want %+v", cfg, want)
	}
}

func TestResolveConfigFile(t *testing.T) {
	env := map[string]string{"OMNICTX_CONFIG": fixturePath("config_full.yaml")}
	cfg, _ := Resolve(Flags{}, envFunc(env), "/home")
	if cfg.Icons != false {
		t.Errorf("icons = %v, want false (from file)", cfg.Icons)
	}
	if cfg.Separator != " | " {
		t.Errorf("separator = %q, want %q", cfg.Separator, " | ")
	}
	if !reflect.DeepEqual(cfg.Segments, []string{SegmentKube, SegmentCloud}) {
		t.Errorf("segments = %v, want [kube cloud]", cfg.Segments)
	}
	// Partial colors map merges over defaults.
	if cfg.Colors[SegmentAzure] != "green" || cfg.Colors[SegmentKube] != "magenta" {
		t.Errorf("colors = %v, want azure=green kube=magenta", cfg.Colors)
	}
	if cfg.Colors[SegmentNamespace] != "dim" {
		t.Errorf("namespace color = %q, want default dim", cfg.Colors[SegmentNamespace])
	}
}

func TestResolveBrokenConfigFallsBack(t *testing.T) {
	env := map[string]string{"OMNICTX_CONFIG": fixturePath("config_broken.yaml")}
	cfg, debug := Resolve(Flags{}, envFunc(env), "/home")
	if !reflect.DeepEqual(cfg, Defaults()) {
		t.Fatalf("broken config should fall back to defaults, got %+v", cfg)
	}
	if len(debug) == 0 {
		t.Errorf("expected a debug note about the broken config")
	}
}

func TestResolveDisabledViaConfig(t *testing.T) {
	env := map[string]string{"OMNICTX_CONFIG": fixturePath("config_disabled.yaml")}
	cfg, _ := Resolve(Flags{}, envFunc(env), "/home")
	if cfg.Enabled {
		t.Fatalf("enabled = true, want false from config")
	}
}

func TestPrecedenceEnvOverFile(t *testing.T) {
	env := map[string]string{
		"OMNICTX_SEPARATOR": "ENV_SEP",
		"OMNICTX_ICONS":     "true",
		"OMNICTX_CONFIG":    fixturePath("config_full.yaml"),
	}
	// File says separator " | " & icons false; env overrides both.
	cfg, _ := Resolve(Flags{}, envFunc(env), "/home")
	if cfg.Separator != "ENV_SEP" {
		t.Errorf("separator = %q, want ENV_SEP (env wins over file)", cfg.Separator)
	}
	if cfg.Icons != true {
		t.Errorf("icons = %v, want true (env wins over file)", cfg.Icons)
	}
}

func TestShellFlagOverEnv(t *testing.T) {
	env := map[string]string{"OMNICTX_SHELL": "zsh"}
	cfg, _ := Resolve(Flags{Shell: strp("bash")}, envFunc(env), "/home")
	if cfg.Shell != ShellBash {
		t.Errorf("shell = %q, want bash (flag over env)", cfg.Shell)
	}
}

func TestEnvOverFile(t *testing.T) {
	env := map[string]string{
		"OMNICTX_CONFIG":   fixturePath("config_full.yaml"),
		"OMNICTX_SEGMENTS": "azure,namespace",
	}
	cfg, _ := Resolve(Flags{}, envFunc(env), "/home")
	if !reflect.DeepEqual(cfg.Segments, []string{SegmentCloud, SegmentNamespace}) {
		t.Fatalf("segments = %v, want [cloud namespace] (env over file)", cfg.Segments)
	}
}

func TestSegmentAliasesAndDedup(t *testing.T) {
	// az and azure both alias the single cloud slot, so the duplicate is dropped.
	env := map[string]string{"OMNICTX_SEGMENTS": "az, k8s , ns, azure, bogus"}
	cfg, _ := Resolve(Flags{}, envFunc(env), "/home")
	if !reflect.DeepEqual(cfg.Segments, []string{SegmentCloud, SegmentKube, SegmentNamespace}) {
		t.Fatalf("segments = %v, want [cloud kube namespace] (aliases normalized, dups/unknown dropped)", cfg.Segments)
	}
}

func TestCloudSelectionAndNormalize(t *testing.T) {
	// Default is auto.
	if cfg, _ := Resolve(Flags{}, envFunc(nil), "/home"); cfg.Cloud != CloudAuto {
		t.Errorf("default cloud = %q, want auto", cfg.Cloud)
	}
	// Env overrides default.
	cfg, _ := Resolve(Flags{}, envFunc(map[string]string{"OMNICTX_CLOUD": "aws"}), "/home")
	if cfg.Cloud != "aws" {
		t.Errorf("cloud = %q, want aws (from env)", cfg.Cloud)
	}
	// Valid values pass through; "none" is allowed.
	for _, v := range []string{"azure", "aws", "gcp", "none", "auto"} {
		env := map[string]string{"OMNICTX_CLOUD": v}
		if cfg, _ := Resolve(Flags{}, envFunc(env), "/home"); cfg.Cloud != v {
			t.Errorf("cloud %q normalized to %q, want unchanged", v, cfg.Cloud)
		}
	}
	// Garbage falls back to auto.
	env := map[string]string{"OMNICTX_CLOUD": "nonsense"}
	if cfg, _ := Resolve(Flags{}, envFunc(env), "/home"); cfg.Cloud != CloudAuto {
		t.Errorf("invalid cloud normalized to %q, want auto", cfg.Cloud)
	}
}

func TestShellOnlyFromFlagOrEnvNotFile(t *testing.T) {
	// Shell is never a config key; default is none even with a full config file.
	env := map[string]string{"OMNICTX_CONFIG": fixturePath("config_full.yaml")}
	cfg, _ := Resolve(Flags{}, envFunc(env), "/home")
	if cfg.Shell != ShellNone {
		t.Errorf("shell = %q, want none by default", cfg.Shell)
	}
	cfg, _ = Resolve(Flags{Shell: strp("bash")}, envFunc(nil), "/home")
	if cfg.Shell != ShellBash {
		t.Errorf("shell = %q, want bash from flag", cfg.Shell)
	}
	cfg, _ = Resolve(Flags{}, envFunc(map[string]string{"OMNICTX_SHELL": "zsh"}), "/home")
	if cfg.Shell != ShellZsh {
		t.Errorf("shell = %q, want zsh from env", cfg.Shell)
	}
}
