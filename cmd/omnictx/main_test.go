package main

import (
	"strings"
	"testing"
)

func TestParseRenderArgsUnsetFlagsAreNil(t *testing.T) {
	flags, showVersion, showHelp, ok := parseRenderArgs(nil)
	if !ok {
		t.Fatal("parse should succeed on empty args")
	}
	if showVersion {
		t.Error("version should be false by default")
	}
	if showHelp {
		t.Error("help should be false by default")
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
	flags, _, _, ok := parseRenderArgs([]string{
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
			flags, _, _, ok := parseRenderArgs(tt.args)
			if !ok {
				t.Fatal("parse failed")
			}
			assertBoolPtr(t, "icons", flags.Icons, tt.want)
		})
	}
}

// The master on/off is a single --enabled flag (Go bool flag): bare --enabled
// means true, --enabled=false disables, and an unset flag stays nil so the env
// var keeps driving omnion/omnioff.
func TestParseRenderArgsEnabledReconciliation(t *testing.T) {
	tests := []struct {
		name string
		args []string
		want *bool
	}{
		{"neither", []string{}, nil},
		{"enabled", []string{"--enabled"}, boolp(true)},
		{"enabled=true", []string{"--enabled=true"}, boolp(true)},
		{"enabled=false", []string{"--enabled=false"}, boolp(false)},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			flags, _, _, ok := parseRenderArgs(tt.args)
			if !ok {
				t.Fatal("parse failed")
			}
			assertBoolPtr(t, "enabled", flags.Enabled, tt.want)
		})
	}
}

func TestParseRenderArgsVersion(t *testing.T) {
	_, showVersion, _, ok := parseRenderArgs([]string{"--version"})
	if !ok || !showVersion {
		t.Fatalf("expected version=true ok=true, got version=%v ok=%v", showVersion, ok)
	}
}

func TestParseRenderArgsBadFlag(t *testing.T) {
	_, _, _, ok := parseRenderArgs([]string{"--definitely-not-a-flag"})
	if ok {
		t.Fatal("parse of an unknown flag must report ok=false so the prompt is protected")
	}
}

// --help / -h must be reported as a clean help request (ok=true, showHelp=true),
// not as a parse error, so the caller can print usage and exit 0.
func TestParseRenderArgsHelp(t *testing.T) {
	for _, arg := range []string{"--help", "-h"} {
		_, _, showHelp, ok := parseRenderArgs([]string{arg})
		if !ok || !showHelp {
			t.Fatalf("%s: expected ok=true showHelp=true, got ok=%v showHelp=%v", arg, ok, showHelp)
		}
	}
}

// printUsage must be the grouped custom usage: description, usage, subcommands,
// flags with allowed values + env vars, double-dash display, and the resolved
// single --enabled flag (no --disabled).
func TestUsageContainsSections(t *testing.T) {
	var sb strings.Builder
	printUsage(&sb)
	out := sb.String()

	for _, want := range []string{
		"omnictx —",                      // one-line description
		"Usage:",                         // usage section
		`eval "$(omnictx init bash)"`,    // quick example
		"Subcommands:",                   // subcommands section
		"init <bash|zsh>",                // init subcommand
		"Flags:",                         // flags section
		"--shell <bash|zsh|none>",        // flag with allowed values
		"OMNICTX_SHELL",                  // env mapping inline
		"--segments <list>",              //
		"OMNICTX_SEGMENTS",               //
		"--icons / --no-icons",           // icons on one line
		"--enabled[=<bool>]",             // single resolved master flag
		"OMNICTX_ENABLED",                //
		"--config <path>",                //
		"-h, --help",                     //
		"omnion / omnioff / omnitoggle",  // toggles named
	} {
		if !strings.Contains(out, want) {
			t.Errorf("usage missing %q\n---\n%s", want, out)
		}
	}

	if strings.Contains(out, "--disabled") {
		t.Errorf("usage should not mention the removed --disabled flag\n%s", out)
	}
	// Display must use double-dash, never the single-dash flag dump.
	if strings.Contains(out, " -shell ") || strings.Contains(out, " -enabled ") {
		t.Errorf("usage should display --flag (double dash), got single-dash form:\n%s", out)
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
