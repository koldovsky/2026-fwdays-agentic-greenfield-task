package main

import (
	"testing"
)

func TestParseRenderArgsUnsetFlagsAreNil(t *testing.T) {
	flags, showVersion, ok := parseRenderArgs(nil)
	if !ok {
		t.Fatal("parse should succeed on empty args")
	}
	if showVersion {
		t.Error("version should be false by default")
	}
	if flags.Segments != nil || flags.Shell != nil || flags.Separator != nil ||
		flags.ConfigPath != nil || flags.Icons != nil || flags.Enabled != nil {
		t.Errorf("no flags set, all optional pointers should be nil: %+v", flags)
	}
	if flags.NoKube || flags.NoNamespace || flags.NoAzure || flags.Debug {
		t.Errorf("no bool flags set, all should be false: %+v", flags)
	}
}

func TestParseRenderArgsValues(t *testing.T) {
	flags, _, ok := parseRenderArgs([]string{
		"--segments", "azure,kube",
		"--shell", "bash",
		"--separator", " | ",
		"--config", "/tmp/c.yaml",
		"--no-namespace",
		"--debug",
	})
	if !ok {
		t.Fatal("parse should succeed")
	}
	if flags.Segments == nil || *flags.Segments != "azure,kube" {
		t.Errorf("segments = %v", flags.Segments)
	}
	if flags.Shell == nil || *flags.Shell != "bash" {
		t.Errorf("shell = %v", flags.Shell)
	}
	if flags.Separator == nil || *flags.Separator != " | " {
		t.Errorf("separator = %v", flags.Separator)
	}
	if flags.ConfigPath == nil || *flags.ConfigPath != "/tmp/c.yaml" {
		t.Errorf("config = %v", flags.ConfigPath)
	}
	if !flags.NoNamespace {
		t.Error("no-namespace should be true")
	}
	if !flags.Debug {
		t.Error("debug should be true")
	}
}

func TestParseRenderArgsIconsReconciliation(t *testing.T) {
	tests := []struct {
		name string
		args []string
		want *bool // nil = unset
	}{
		{"neither", []string{}, nil},
		{"icons", []string{"--icons"}, boolp(true)},
		{"no-icons", []string{"--no-icons"}, boolp(false)},
		{"both: no-icons wins", []string{"--icons", "--no-icons"}, boolp(false)},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			flags, _, ok := parseRenderArgs(tt.args)
			if !ok {
				t.Fatal("parse failed")
			}
			assertBoolPtr(t, "icons", flags.Icons, tt.want)
		})
	}
}

func TestParseRenderArgsEnabledReconciliation(t *testing.T) {
	tests := []struct {
		name string
		args []string
		want *bool
	}{
		{"neither", []string{}, nil},
		{"enabled", []string{"--enabled"}, boolp(true)},
		{"disabled", []string{"--disabled"}, boolp(false)},
		{"both: disabled wins", []string{"--enabled", "--disabled"}, boolp(false)},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			flags, _, ok := parseRenderArgs(tt.args)
			if !ok {
				t.Fatal("parse failed")
			}
			assertBoolPtr(t, "enabled", flags.Enabled, tt.want)
		})
	}
}

func TestParseRenderArgsVersion(t *testing.T) {
	_, showVersion, ok := parseRenderArgs([]string{"--version"})
	if !ok || !showVersion {
		t.Fatalf("expected version=true ok=true, got version=%v ok=%v", showVersion, ok)
	}
}

func TestParseRenderArgsBadFlag(t *testing.T) {
	_, _, ok := parseRenderArgs([]string{"--definitely-not-a-flag"})
	if ok {
		t.Fatal("parse of an unknown flag must report ok=false so the prompt is protected")
	}
}

func boolp(b bool) *bool { return &b }

func assertBoolPtr(t *testing.T, name string, got, want *bool) {
	t.Helper()
	switch {
	case want == nil && got != nil:
		t.Errorf("%s = %v, want nil", name, *got)
	case want != nil && got == nil:
		t.Errorf("%s = nil, want %v", name, *want)
	case want != nil && got != nil && *got != *want:
		t.Errorf("%s = %v, want %v", name, *got, *want)
	}
}
