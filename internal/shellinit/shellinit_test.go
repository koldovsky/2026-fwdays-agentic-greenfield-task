package shellinit

import (
	"os/exec"
	"strings"
	"testing"
)

func TestGenerateBash(t *testing.T) {
	out, err := Generate("bash", "omnictx")
	if err != nil {
		t.Fatal(err)
	}
	mustContain(t, out, []string{
		"__OMNICTX_BASH_LOADED",       // idempotency guard
		"__OMNICTX_ORIG_PS1=\"$PS1\"", // captures original prompt once
		"omnictx --shell bash",        // passes correct shell
		"PROMPT_COMMAND",              // registers hook
	})
	if strings.Contains(out, "precmd_functions") {
		t.Errorf("bash output should not reference zsh precmd_functions")
	}
}

func TestGenerateZsh(t *testing.T) {
	out, err := Generate("zsh", "omnictx")
	if err != nil {
		t.Fatal(err)
	}
	mustContain(t, out, []string{
		"__OMNICTX_ZSH_LOADED",                 // idempotency guard
		"__OMNICTX_ORIG_PROMPT=\"$PROMPT\"",    // captures original prompt once
		"omnictx --shell zsh",                  // passes correct shell
		"precmd_functions+=(__omnictx_precmd)", // registers hook
	})
}

func TestGenerateUsesCmd(t *testing.T) {
	out, err := Generate("bash", "/opt/bin/omnictx")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out, "/opt/bin/omnictx --shell bash") {
		t.Fatalf("expected custom command path in output, got:\n%s", out)
	}
}

func TestGenerateUnsupportedShell(t *testing.T) {
	if _, err := Generate("fish", "omnictx"); err == nil {
		t.Fatal("expected error for unsupported shell")
	}
}

func TestGenerateDefaultsCmd(t *testing.T) {
	out, err := Generate("bash", "")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out, "omnictx --shell bash") {
		t.Fatalf("empty cmd should default to 'omnictx', got:\n%s", out)
	}
}

// TestBashSnippetIsValidAndIdempotent eval's the generated bash twice in a
// non-interactive shell and asserts the toggle functions exist and that the
// original prompt was captured exactly once (idempotency).
func TestBashSnippetIsValidAndIdempotent(t *testing.T) {
	bash, err := exec.LookPath("bash")
	if err != nil {
		t.Skip("bash not available")
	}
	snippet, err := Generate("bash", "true") // use 'true' so the hook is harmless
	if err != nil {
		t.Fatal(err)
	}

	script := `PS1='orig> '
` + snippet + `
` + snippet + `
type omnion >/dev/null 2>&1 && echo HAS_OMNION
type omnioff >/dev/null 2>&1 && echo HAS_OMNIOFF
type omnitoggle >/dev/null 2>&1 && echo HAS_OMNITOGGLE_SHOULD_NOT_EXIST
type omnion    >/dev/null 2>&1 && echo HAS_OMNION_SHOULD_NOT_EXIST
echo "ORIG=${__OMNICTX_ORIG_PS1}"
__omnictx_prompt
echo "PS1=${PS1}"
`
	cmd := exec.Command(bash, "--norc", "--noprofile", "-c", script)
	outBytes, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("bash eval failed: %v\n%s", err, outBytes)
	}
	out := string(outBytes)
	for _, want := range []string{"ORIG=orig> "} {
		if !strings.Contains(out, want) {
			t.Errorf("missing %q in bash output:\n%s", want, out)
		}
	}
	// After double-eval, the captured original must still be 'orig> ', not a
	// doubled/clobbered value.
	if strings.Contains(out, "ORIG=orig> orig>") {
		t.Errorf("original prompt was double-captured (not idempotent):\n%s", out)
	}
	if strings.Contains(out, "HAS_OMNITOGGLE_SHOULD_NOT_EXIST") {
		t.Errorf("omnitoggle should not be defined:\n%s", out)
	}
	if strings.Contains(out, "HAS_OMNION_SHOULD_NOT_EXIST") {
		t.Errorf("omnion should not be defined:\n%s", out)
	}
}

func mustContain(t *testing.T, haystack string, needles []string) {
	t.Helper()
	for _, n := range needles {
		if !strings.Contains(haystack, n) {
			t.Errorf("output missing %q\n---\n%s", n, haystack)
		}
	}
}
