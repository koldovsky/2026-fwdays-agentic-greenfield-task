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
func boolp(b bool) *bool    { return &b }

func fixturePath(name string) string {
	return filepath.Join("testdata", name)
}

func TestResolveDefaults(t *testing.T) {
	// No flags, no env, and a config path that does not exist -> built-ins.
	cfg, _ := Resolve(Flags{ConfigPath: strp(fixturePath("does_not_exist.yaml"))}, envFunc(nil), "/home")
	want := Defaults()
	if !reflect.DeepEqual(cfg, want) {
		t.Fatalf("Resolve() = %+v, want %+v", cfg, want)
	}
}

func TestResolveConfigFile(t *testing.T) {
	cfg, _ := Resolve(Flags{ConfigPath: strp(fixturePath("config_full.yaml"))}, envFunc(nil), "/home")
	if cfg.Icons != false {
		t.Errorf("icons = %v, want false (from file)", cfg.Icons)
	}
	if cfg.Separator != " | " {
		t.Errorf("separator = %q, want %q", cfg.Separator, " | ")
	}
	if !reflect.DeepEqual(cfg.Segments, []string{SegmentKube, SegmentAzure}) {
		t.Errorf("segments = %v, want [kube azure]", cfg.Segments)
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
	cfg, debug := Resolve(Flags{ConfigPath: strp(fixturePath("config_broken.yaml")), Debug: true}, envFunc(nil), "/home")
	if !reflect.DeepEqual(cfg, Defaults()) {
		t.Fatalf("broken config should fall back to defaults, got %+v", cfg)
	}
	if len(debug) == 0 {
		t.Errorf("expected a debug note about the broken config")
	}
}

func TestResolveDisabledViaConfig(t *testing.T) {
	cfg, _ := Resolve(Flags{ConfigPath: strp(fixturePath("config_disabled.yaml"))}, envFunc(nil), "/home")
	if cfg.Enabled {
		t.Fatalf("enabled = true, want false from config")
	}
}

func TestPrecedenceFlagOverEnvOverFile(t *testing.T) {
	env := map[string]string{
		"OMNICTX_SEPARATOR": "ENV_SEP",
		"OMNICTX_ICONS":     "true",
		"OMNICTX_CONFIG":    fixturePath("config_full.yaml"),
	}
	// File says separator " | " & icons false; env overrides both; flag overrides separator again.
	cfg, _ := Resolve(Flags{Separator: strp("FLAG_SEP")}, envFunc(env), "/home")

	if cfg.Separator != "FLAG_SEP" {
		t.Errorf("separator = %q, want FLAG_SEP (flag wins)", cfg.Separator)
	}
	if cfg.Icons != true {
		t.Errorf("icons = %v, want true (env wins over file)", cfg.Icons)
	}
}

func TestEnvOverFile(t *testing.T) {
	env := map[string]string{
		"OMNICTX_CONFIG":   fixturePath("config_full.yaml"),
		"OMNICTX_SEGMENTS": "azure,namespace",
	}
	cfg, _ := Resolve(Flags{}, envFunc(env), "/home")
	if !reflect.DeepEqual(cfg.Segments, []string{SegmentAzure, SegmentNamespace}) {
		t.Fatalf("segments = %v, want [azure namespace] (env over file)", cfg.Segments)
	}
}

func TestNoFlagsOverrideSegments(t *testing.T) {
	cfg, _ := Resolve(Flags{
		Segments:    strp("azure,kube,namespace"),
		NoNamespace: true,
	}, envFunc(nil), "/home")
	if !reflect.DeepEqual(cfg.Segments, []string{SegmentAzure, SegmentKube}) {
		t.Fatalf("segments = %v, want [azure kube] (--no-namespace drops it)", cfg.Segments)
	}
}

func TestNoFlagsOverrideConfigSegments(t *testing.T) {
	cfg, _ := Resolve(Flags{
		ConfigPath: strp(fixturePath("config_full.yaml")), // [kube, azure]
		NoKube:     true,
	}, envFunc(nil), "/home")
	if !reflect.DeepEqual(cfg.Segments, []string{SegmentAzure}) {
		t.Fatalf("segments = %v, want [azure] (--no-kube drops kube from file segments)", cfg.Segments)
	}
}

func TestSegmentAliasesAndDedup(t *testing.T) {
	cfg, _ := Resolve(Flags{Segments: strp("az, k8s , ns, azure, bogus")}, envFunc(nil), "/home")
	if !reflect.DeepEqual(cfg.Segments, []string{SegmentAzure, SegmentKube, SegmentNamespace}) {
		t.Fatalf("segments = %v, want [azure kube namespace] (aliases normalized, dups/unknown dropped)", cfg.Segments)
	}
}

func TestShellOnlyFromFlagOrEnvNotFile(t *testing.T) {
	// Shell is never a config key; default is none even with a full config file.
	cfg, _ := Resolve(Flags{ConfigPath: strp(fixturePath("config_full.yaml"))}, envFunc(nil), "/home")
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

func TestEnabledFlagViaDisabled(t *testing.T) {
	cfg, _ := Resolve(Flags{Enabled: boolp(false)}, envFunc(nil), "/home")
	if cfg.Enabled {
		t.Fatalf("enabled = true, want false from flag")
	}
}
