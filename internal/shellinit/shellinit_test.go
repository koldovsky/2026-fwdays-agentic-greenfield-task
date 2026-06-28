package shellinit

import (
	"os/exec"
	"strings"
	"testing"
)

func TestGenerateBash(t *testing.T) {
	out, err := Generate("bash", "ctxline")
	if err != nil {
		t.Fatal(err)
	}
	mustContain(t, out, []string{
		"__CTXLINE_BASH_LOADED",       // idempotency guard
		"__CTXLINE_ORIG_PS1=\"$PS1\"", // captures original prompt once
		"ctxline --shell bash",        // passes correct shell
		"PROMPT_COMMAND",              // registers hook
		"ctxon()", "ctxoff()", "ctxtoggle()",
		"CTXLINE_ENABLED=true", "CTXLINE_ENABLED=false",
	})
	if strings.Contains(out, "precmd_functions") {
		t.Errorf("bash output should not reference zsh precmd_functions")
	}
}

func TestGenerateZsh(t *testing.T) {
	out, err := Generate("zsh", "ctxline")
	if err != nil {
		t.Fatal(err)
	}
	mustContain(t, out, []string{
		"__CTXLINE_ZSH_LOADED",                 // idempotency guard
		"__CTXLINE_ORIG_PROMPT=\"$PROMPT\"",    // captures original prompt once
		"ctxline --shell zsh",                  // passes correct shell
		"precmd_functions+=(__ctxline_precmd)", // registers hook
		"ctxon()", "ctxoff()", "ctxtoggle()",
	})
}

func TestGenerateUsesCmd(t *testing.T) {
	out, err := Generate("bash", "/opt/bin/ctxline")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out, "/opt/bin/ctxline --shell bash") {
		t.Fatalf("expected custom command path in output, got:\n%s", out)
	}
}

func TestGenerateUnsupportedShell(t *testing.T) {
	if _, err := Generate("fish", "ctxline"); err == nil {
		t.Fatal("expected error for unsupported shell")
	}
}

func TestGenerateDefaultsCmd(t *testing.T) {
	out, err := Generate("bash", "")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out, "ctxline --shell bash") {
		t.Fatalf("empty cmd should default to 'ctxline', got:\n%s", out)
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
type ctxon >/dev/null 2>&1 && echo HAS_CTXON
type ctxoff >/dev/null 2>&1 && echo HAS_CTXOFF
type ctxtoggle >/dev/null 2>&1 && echo HAS_CTXTOGGLE
echo "ORIG=${__CTXLINE_ORIG_PS1}"
__ctxline_prompt
echo "PS1=${PS1}"
`
	cmd := exec.Command(bash, "--norc", "--noprofile", "-c", script)
	outBytes, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("bash eval failed: %v\n%s", err, outBytes)
	}
	out := string(outBytes)
	for _, want := range []string{"HAS_CTXON", "HAS_CTXOFF", "HAS_CTXTOGGLE", "ORIG=orig> "} {
		if !strings.Contains(out, want) {
			t.Errorf("missing %q in bash output:\n%s", want, out)
		}
	}
	// After double-eval, the captured original must still be 'orig> ', not a
	// doubled/clobbered value.
	if strings.Contains(out, "ORIG=orig> orig>") {
		t.Errorf("original prompt was double-captured (not idempotent):\n%s", out)
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
