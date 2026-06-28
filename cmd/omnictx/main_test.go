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

