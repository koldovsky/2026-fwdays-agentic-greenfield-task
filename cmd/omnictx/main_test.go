package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"omnictx/internal/config"
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
		"cloud [azure|aws|gcp|auto|none|on|off]",
		"OMNICTX_CLOUD", // the per-session override is worth calling out
	} {
		if !strings.Contains(out, want) {
			t.Errorf("usage missing %q\n---\n%s", want, out)
		}
	}
}

// The kube subcommand must be listed under Subcommands.
func TestUsageListsKubeSubcommand(t *testing.T) {
	var sb strings.Builder
	printUsage(&sb)
	out := sb.String()

	for _, want := range []string{
		"kube [<context>|list|on|off]",
		"kubeconfig",
		"OMNICTX_KUBE", // the per-session override is worth calling out
	} {
		if !strings.Contains(out, want) {
			t.Errorf("usage missing %q\n---\n%s", want, out)
		}
	}
}

// kindKubeconfig has two contexts (kind-1 current) — the fixture for runKube.
const kindKubeconfig = `# test kubeconfig
apiVersion: v1
kind: Config
current-context: kind-1
contexts:
  - name: kind-1
    context:
      cluster: kind-1
      user: kind-1-user
      namespace: payments
  - name: kind-2
    context:
      cluster: kind-2
      user: kind-2-user
      namespace: staging
`

// kubeTestConfig writes a kubeconfig fixture and points KUBECONFIG at it.
func kubeTestConfig(t *testing.T, content string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "config")
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("KUBECONFIG", path)
	return path
}

func TestRunKubeSwitch(t *testing.T) {
	path := kubeTestConfig(t, kindKubeconfig)

	var stdout, stderr strings.Builder
	if code := runKube([]string{"kind-2"}, &stdout, &stderr); code != 0 {
		t.Fatalf("exit code = %d, want 0 (stderr: %s)", code, stderr.String())
	}

	// Exactly one line changed, comments preserved.
	data, _ := os.ReadFile(path)
	want := strings.Replace(kindKubeconfig, "current-context: kind-1", "current-context: kind-2", 1)
	if string(data) != want {
		t.Errorf("kubeconfig after switch:\n%s\nwant:\n%s", data, want)
	}

	// The switch is visible to the read path (and therefore to render).
	stdout.Reset()
	if code := runKube(nil, &stdout, &stderr); code != 0 {
		t.Fatalf("read-back exit code = %d", code)
	}
	if stdout.String() != "kind-2\n" {
		t.Errorf("read-back = %q, want %q", stdout.String(), "kind-2\n")
	}
}

func TestRunKubeUnknownContext(t *testing.T) {
	path := kubeTestConfig(t, kindKubeconfig)

	var stdout, stderr strings.Builder
	if code := runKube([]string{"kind-3"}, &stdout, &stderr); code != 2 {
		t.Fatalf("exit code = %d, want 2", code)
	}
	for _, want := range []string{"kind-1", "kind-2", `"kind-3"`} {
		if !strings.Contains(stderr.String(), want) {
			t.Errorf("stderr missing %q:\n%s", want, stderr.String())
		}
	}
	if data, _ := os.ReadFile(path); string(data) != kindKubeconfig {
		t.Errorf("kubeconfig must not be modified on a usage error:\n%s", data)
	}
}

func TestRunKubeList(t *testing.T) {
	kubeTestConfig(t, kindKubeconfig)

	var stdout, stderr strings.Builder
	if code := runKube([]string{"list"}, &stdout, &stderr); code != 0 {
		t.Fatalf("exit code = %d, want 0 (stderr: %s)", code, stderr.String())
	}

	lines := strings.Split(strings.TrimRight(stdout.String(), "\n"), "\n")
	if len(lines) != 3 {
		t.Fatalf("want header + 2 rows, got %d lines:\n%s", len(lines), stdout.String())
	}
	// Header with all columns in order.
	for _, col := range []string{"CURRENT", "NAME", "CLUSTER", "AUTHINFO", "NAMESPACE"} {
		if !strings.Contains(lines[0], col) {
			t.Errorf("header missing %q: %q", col, lines[0])
		}
	}
	// kind-1 is current: its row starts with the * marker, kind-2's does not.
	if !strings.HasPrefix(lines[1], "*") || !strings.Contains(lines[1], "kind-1") {
		t.Errorf("current row = %q, want kind-1 marked with *", lines[1])
	}
	if strings.HasPrefix(lines[2], "*") || !strings.Contains(lines[2], "kind-2") {
		t.Errorf("row = %q, want unmarked kind-2", lines[2])
	}
	// Cluster, user, and namespace columns are populated from the kubeconfig.
	for _, want := range []string{"kind-2", "kind-2-user", "staging"} {
		if !strings.Contains(lines[2], want) {
			t.Errorf("kind-2 row missing %q: %q", want, lines[2])
		}
	}
}

func TestRunKubeListEmptyStaysQuiet(t *testing.T) {
	t.Setenv("KUBECONFIG", filepath.Join(t.TempDir(), "missing"))

	var stdout, stderr strings.Builder
	if code := runKube([]string{"list"}, &stdout, &stderr); code != 0 {
		t.Fatalf("exit code = %d, want 0", code)
	}
	if stdout.String() != "" {
		t.Errorf("no contexts must print nothing (not even a header), got %q", stdout.String())
	}
}

// `list` is reserved: even a context literally named "list" is listed, not
// switched to, and nothing is written.
func TestRunKubeListIsReserved(t *testing.T) {
	cfg := `apiVersion: v1
kind: Config
current-context: kind-1
contexts:
  - name: kind-1
    context:
      cluster: kind-1
  - name: list
    context:
      cluster: sneaky
`
	path := kubeTestConfig(t, cfg)

	var stdout, stderr strings.Builder
	if code := runKube([]string{"list"}, &stdout, &stderr); code != 0 {
		t.Fatalf("exit code = %d, want 0", code)
	}
	lines := strings.Split(strings.TrimRight(stdout.String(), "\n"), "\n")
	if len(lines) != 3 {
		t.Fatalf("want header + 2 rows, got %d lines:\n%s", len(lines), stdout.String())
	}
	if !strings.HasPrefix(lines[1], "*") || !strings.Contains(lines[1], "kind-1") {
		t.Errorf("current row = %q, want kind-1 marked with *", lines[1])
	}
	if !strings.Contains(lines[2], "list") || !strings.Contains(lines[2], "sneaky") {
		t.Errorf("row = %q, want the context named list with its cluster", lines[2])
	}
	if data, _ := os.ReadFile(path); string(data) != cfg {
		t.Errorf("kubeconfig must not be modified by the list form:\n%s", data)
	}
}

func TestRunKubeNoArg(t *testing.T) {
	t.Run("prints current context", func(t *testing.T) {
		kubeTestConfig(t, kindKubeconfig)
		var stdout, stderr strings.Builder
		if code := runKube(nil, &stdout, &stderr); code != 0 {
			t.Fatalf("exit code = %d, want 0", code)
		}
		if stdout.String() != "kind-1\n" {
			t.Errorf("stdout = %q, want %q", stdout.String(), "kind-1\n")
		}
	})
	t.Run("quiet when no kubeconfig", func(t *testing.T) {
		t.Setenv("KUBECONFIG", filepath.Join(t.TempDir(), "missing"))
		var stdout, stderr strings.Builder
		if code := runKube(nil, &stdout, &stderr); code != 0 {
			t.Fatalf("exit code = %d, want 0", code)
		}
		if stdout.String() != "" {
			t.Errorf("stdout = %q, want empty", stdout.String())
		}
	})
}

func TestRunKubeTooManyArgs(t *testing.T) {
	kubeTestConfig(t, kindKubeconfig)
	var stdout, stderr strings.Builder
	if code := runKube([]string{"kind-1", "kind-2"}, &stdout, &stderr); code != 2 {
		t.Fatalf("exit code = %d, want 2", code)
	}
	if !strings.Contains(stderr.String(), "usage:") {
		t.Errorf("stderr should show usage:\n%s", stderr.String())
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


func TestRunCloudOnOffAliases(t *testing.T) {
	t.Run("off persists none, on persists auto", func(t *testing.T) {
		path := cloudTestConfig(t)
		var stdout, stderr strings.Builder

		if code := runCloud([]string{"off"}, &stdout, &stderr); code != 0 {
			t.Fatalf("cloud off: exit %d (stderr: %s)", code, stderr.String())
		}
		if data, _ := os.ReadFile(path); !strings.Contains(string(data), "cloud: none") {
			t.Errorf("after off, config should contain cloud: none:\n%s", data)
		}

		if code := runCloud([]string{"on"}, &stdout, &stderr); code != 0 {
			t.Fatalf("cloud on: exit %d (stderr: %s)", code, stderr.String())
		}
		if data, _ := os.ReadFile(path); !strings.Contains(string(data), "cloud: auto") {
			t.Errorf("after on, config should contain cloud: auto:\n%s", data)
		}
	})

	t.Run("off then on loses a provider pin (documented)", func(t *testing.T) {
		path := cloudTestConfig(t)
		var stdout, stderr strings.Builder

		for _, arg := range []string{"aws", "off", "on"} {
			if code := runCloud([]string{arg}, &stdout, &stderr); code != 0 {
				t.Fatalf("cloud %s: exit %d", arg, code)
			}
		}
		data, _ := os.ReadFile(path)
		if !strings.Contains(string(data), "cloud: auto") || strings.Contains(string(data), "cloud: aws") {
			t.Errorf("after aws->off->on, want cloud: auto (pin not remembered):\n%s", data)
		}
	})
}

func TestRunKubeOnOffToggle(t *testing.T) {
	kubeconfigPath := kubeTestConfig(t, kindKubeconfig)
	cfgPath := filepath.Join(t.TempDir(), "config.yaml")
	t.Setenv("OMNICTX_CONFIG", cfgPath)
	orig := "# keep me\nenabled: true\n"
	if err := os.WriteFile(cfgPath, []byte(orig), 0o644); err != nil {
		t.Fatal(err)
	}

	var stdout, stderr strings.Builder
	if code := runKube([]string{"off"}, &stdout, &stderr); code != 0 {
		t.Fatalf("kube off: exit %d (stderr: %s)", code, stderr.String())
	}
	data, _ := os.ReadFile(cfgPath)
	for _, want := range []string{"kube: false", "# keep me", "enabled: true"} {
		if !strings.Contains(string(data), want) {
			t.Errorf("config missing %q after kube off:\n%s", want, data)
		}
	}
	// The toggle must never touch the kubeconfig.
	if kc, _ := os.ReadFile(kubeconfigPath); string(kc) != kindKubeconfig {
		t.Errorf("kubeconfig modified by kube off:\n%s", kc)
	}

	if code := runKube([]string{"on"}, &stdout, &stderr); code != 0 {
		t.Fatalf("kube on: exit %d (stderr: %s)", code, stderr.String())
	}
	if data, _ := os.ReadFile(cfgPath); !strings.Contains(string(data), "kube: true") {
		t.Errorf("config missing kube: true after kube on:\n%s", data)
	}
}

// Even a context literally named "off" is not switchable: the toggle wins and
// the kubeconfig stays byte-identical.
func TestRunKubeOffReservedOverContextName(t *testing.T) {
	cfg := `apiVersion: v1
kind: Config
current-context: kind-1
contexts:
  - name: kind-1
    context:
      cluster: kind-1
  - name: "off"
    context:
      cluster: sneaky
`
	kubeconfigPath := kubeTestConfig(t, cfg)
	t.Setenv("OMNICTX_CONFIG", filepath.Join(t.TempDir(), "config.yaml"))

	var stdout, stderr strings.Builder
	if code := runKube([]string{"off"}, &stdout, &stderr); code != 0 {
		t.Fatalf("kube off: exit %d", code)
	}
	if kc, _ := os.ReadFile(kubeconfigPath); string(kc) != cfg {
		t.Errorf("kubeconfig must stay byte-identical:\n%s", kc)
	}
}

func TestGatherSkipsKubeWhenDisabled(t *testing.T) {
	kubeTestConfig(t, kindKubeconfig)

	cfg := config.Defaults()
	cfg.Cloud = config.CloudNone

	cfg.Kube = false
	if data := gather(cfg, "/nonexistent-home"); data.Kube != "" || data.Namespace != "" {
		t.Errorf("kube disabled: gather = %+v, want empty kube/namespace", data)
	}

	cfg.Kube = true
	if data := gather(cfg, "/nonexistent-home"); data.Kube != "kind-1" || data.Namespace != "payments" {
		t.Errorf("kube enabled: gather = %+v, want kind-1/payments", data)
	}
}

// Regression: setConfigKey must never match a nested key (colors.kube broke
// the user's YAML when `kube off` replaced "  kube: cyan" inside colors).
func TestSetConfigKeyIgnoresNestedKeys(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.yaml")
	orig := "enabled: true\ncolors:\n  cloud: blue\n  kube: cyan\n  namespace: dim\n"
	if err := os.WriteFile(path, []byte(orig), 0o644); err != nil {
		t.Fatal(err)
	}

	if err := setConfigKey(path, "kube", "false"); err != nil {
		t.Fatalf("setConfigKey: %v", err)
	}

	data, _ := os.ReadFile(path)
	got := string(data)
	for _, want := range []string{"kube: false", "  kube: cyan", "  namespace: dim", "  cloud: blue"} {
		if !strings.Contains(got, want) {
			t.Errorf("config missing %q after update:\n%s", want, got)
		}
	}
	// The top-level key must sit at column 0 and the nested block stay intact.
	if !strings.HasPrefix(got, "kube: false\n") {
		t.Errorf("new key should be prepended at top level:\n%s", got)
	}
}
