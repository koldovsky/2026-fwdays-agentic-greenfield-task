package main

import (
	"os"
	"path/filepath"
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
	if flags.Shell != nil {
		t.Errorf("no flags set, Shell should be nil: %+v", flags)
	}
}

func TestParseRenderArgsShell(t *testing.T) {
	flags, _, _, ok := parseRenderArgs([]string{"--shell", "bash"})
	if !ok {
		t.Fatal("parse should succeed")
	}
	if flags.Shell == nil || *flags.Shell != "bash" {
		t.Errorf("shell = %v", flags.Shell)
	}
}

func TestParseRenderArgsUnknownFlagRejected(t *testing.T) {
	_, _, _, ok := parseRenderArgs([]string{"--segments", "cloud,kube"})
	if ok {
		t.Fatal("removed flag --segments must be rejected (protects the prompt)")
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

func TestUsageContainsSections(t *testing.T) {
	var sb strings.Builder
	printUsage(&sb)
	out := sb.String()

	for _, want := range []string{
		"omnictx —",                   // one-line description
		"Usage:",                      // usage section
		`eval "$(omnictx init bash)"`, // quick example
		"Subcommands:",                // subcommands section
		"init <bash|zsh>",             // init subcommand
		"on / off",                    // global on/off
		"persist",                     // describes what on/off does
		"config file",                 // mentions config file
		"Flags:",                      // flags section
		"-h, --help",                  // help flag
	} {
		if !strings.Contains(out, want) {
			t.Errorf("usage missing %q\n---\n%s", want, out)
		}
	}

	for _, bad := range []string{"--cloud ", "--segments ", "--separator ", "--enabled", "--debug", "--config "} {
		if strings.Contains(out, bad) {
			t.Errorf("usage should not mention removed flag %q\n%s", bad, out)
		}
	}
}

// The cloud subcommand must be listed under Subcommands with its allowed values.
func TestUsageListsCloudSubcommand(t *testing.T) {
	var sb strings.Builder
	printUsage(&sb)
	out := sb.String()

	for _, want := range []string{
		"cloud [azure|aws|gcp|auto|none]",
		"OMNICTX_CLOUD", // the per-session override is worth calling out
	} {
		if !strings.Contains(out, want) {
			t.Errorf("usage missing %q\n---\n%s", want, out)
		}
	}
}

// cloudTestConfig points OMNICTX_CONFIG at a temp file and neutralizes
// OMNICTX_CLOUD so the ambient environment cannot leak into the test.
func cloudTestConfig(t *testing.T) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "config.yaml")
	t.Setenv("OMNICTX_CONFIG", path)
	t.Setenv("OMNICTX_CLOUD", "") // empty value is ignored by config.Resolve
	return path
}

func TestRunCloudPersistValues(t *testing.T) {
	tests := []struct {
		name string
		arg  string
		want string // value expected after "cloud: "
	}{
		{"azure", "azure", "azure"},
		{"aws", "aws", "aws"},
		{"gcp", "gcp", "gcp"},
		{"auto", "auto", "auto"},
		{"none", "none", "none"},
		{"uppercase is normalized", "AWS", "aws"},
		{"surrounding spaces are trimmed", " gcp ", "gcp"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			path := cloudTestConfig(t)
			var stdout, stderr strings.Builder

			if code := runCloud([]string{tt.arg}, &stdout, &stderr); code != 0 {
				t.Fatalf("exit code = %d, want 0 (stderr: %s)", code, stderr.String())
			}
			data, err := os.ReadFile(path)
			if err != nil {
				t.Fatalf("config not written: %v", err)
			}
			if want := "cloud: " + tt.want; !strings.Contains(string(data), want) {
				t.Errorf("config missing %q:\n%s", want, data)
			}
		})
	}
}

// Only the cloud: line may change; comments and other keys must survive.
func TestRunCloudPreservesOtherLines(t *testing.T) {
	path := cloudTestConfig(t)
	orig := "# my precious comment\nenabled: true\ncloud: auto\nseparator: \" \"\n"
	if err := os.WriteFile(path, []byte(orig), 0o644); err != nil {
		t.Fatal(err)
	}

	var stdout, stderr strings.Builder
	if code := runCloud([]string{"aws"}, &stdout, &stderr); code != 0 {
		t.Fatalf("exit code = %d, want 0 (stderr: %s)", code, stderr.String())
	}

	data, _ := os.ReadFile(path)
	got := string(data)
	for _, want := range []string{"# my precious comment", "enabled: true", "cloud: aws", `separator: " "`} {
		if !strings.Contains(got, want) {
			t.Errorf("config missing %q after update:\n%s", want, got)
		}
	}
	if strings.Contains(got, "cloud: auto") {
		t.Errorf("old cloud value survived:\n%s", got)
	}
}

func TestRunCloudCreatesFileAndDir(t *testing.T) {
	// Parent directory does not exist yet — the write must create it.
	path := filepath.Join(t.TempDir(), "nested", "dir", "config.yaml")
	t.Setenv("OMNICTX_CONFIG", path)
	t.Setenv("OMNICTX_CLOUD", "")

	var stdout, stderr strings.Builder
	if code := runCloud([]string{"gcp"}, &stdout, &stderr); code != 0 {
		t.Fatalf("exit code = %d, want 0 (stderr: %s)", code, stderr.String())
	}
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("config not created: %v", err)
	}
	if !strings.Contains(string(data), "cloud: gcp") {
		t.Errorf("config missing cloud: gcp:\n%s", data)
	}
}

func TestRunCloudRejectsInvalid(t *testing.T) {
	tests := []struct {
		name string
		args []string
	}{
		{"typo", []string{"awz"}},
		{"empty", []string{""}},
		{"too many args", []string{"aws", "gcp"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			path := cloudTestConfig(t)
			orig := "cloud: azure\n"
			if err := os.WriteFile(path, []byte(orig), 0o644); err != nil {
				t.Fatal(err)
			}

			var stdout, stderr strings.Builder
			if code := runCloud(tt.args, &stdout, &stderr); code != 2 {
				t.Fatalf("exit code = %d, want 2", code)
			}
			if !strings.Contains(stderr.String(), "azure|aws|gcp|auto|none") {
				t.Errorf("stderr should name the allowed values:\n%s", stderr.String())
			}
			if data, _ := os.ReadFile(path); string(data) != orig {
				t.Errorf("config must not be modified on a usage error:\n%s", data)
			}
		})
	}
}

func TestRunCloudReadBack(t *testing.T) {
	tests := []struct {
		name       string
		fileCloud  string // "" = no config file
		envCloud   string // "" = unset
		wantStdout string
	}{
		{"value from config file", "gcp", "", "gcp\n"},
		{"env overrides config", "gcp", "aws", "aws\n"},
		{"nothing configured falls back to auto", "", "", "auto\n"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			path := cloudTestConfig(t)
			if tt.fileCloud != "" {
				if err := os.WriteFile(path, []byte("cloud: "+tt.fileCloud+"\n"), 0o644); err != nil {
					t.Fatal(err)
				}
			}
			if tt.envCloud != "" {
				t.Setenv("OMNICTX_CLOUD", tt.envCloud)
			}

			var stdout, stderr strings.Builder
			if code := runCloud(nil, &stdout, &stderr); code != 0 {
				t.Fatalf("exit code = %d, want 0 (stderr: %s)", code, stderr.String())
			}
			if stdout.String() != tt.wantStdout {
				t.Errorf("stdout = %q, want %q", stdout.String(), tt.wantStdout)
			}
		})
	}
}

