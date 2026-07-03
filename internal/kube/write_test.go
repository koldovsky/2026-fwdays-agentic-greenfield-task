package kube

import (
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

// kindConfig is a kubeconfig with comments, two contexts, and a current-context
// line — the canvas for byte-level surgery assertions.
const kindConfig = `# top comment must survive
apiVersion: v1
kind: Config
current-context: kind-1
contexts:
  - name: kind-1
    context:
      cluster: kind-1
      namespace: payments # inline comment must survive
  - name: kind-2
    context:
      cluster: kind-2
      namespace: staging
`

// noCurrentConfig defines a context but no current-context line at all.
const noCurrentConfig = `apiVersion: v1
kind: Config
contexts:
  - name: kind-1
    context:
      cluster: kind-1
`

// writeTemp puts content into a fresh temp file and returns its path.
func writeTemp(t *testing.T, content string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "config")
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
	return path
}

func kubeconfigEnv(paths ...string) LookupEnv {
	return envFunc(map[string]string{
		"KUBECONFIG": strings.Join(paths, string(os.PathListSeparator)),
	})
}

func TestContexts(t *testing.T) {
	dir := fixtures(t)
	single := filepath.Join(dir, "kubeconfig_single.yaml")
	a := filepath.Join(dir, "kubeconfig_a.yaml")
	b := filepath.Join(dir, "kubeconfig_b.yaml")
	broken := filepath.Join(dir, "kubeconfig_broken.yaml")

	dev := ContextEntry{Name: "dev", Cluster: "dev-cluster", AuthInfo: "dev-user", Namespace: "payments"}

	tests := []struct {
		name  string
		files []string
		want  []ContextEntry
	}{
		{"single file with full entry", []string{single}, []ContextEntry{dev}},
		{
			"multi-file keeps file-then-definition order",
			[]string{a, b},
			[]ContextEntry{
				{Name: "solo-a", Cluster: "solo-a-cluster", AuthInfo: "solo-a-user", Namespace: "alpha"},
				{Name: "team-a", Cluster: "team-a-cluster", AuthInfo: "team-a-user", Namespace: "gamma"},
				{Name: "team-b", Cluster: "team-b-cluster", AuthInfo: "team-b-user", Namespace: "delta"},
			},
		},
		{"duplicates across files are dropped", []string{single, single}, []ContextEntry{dev}},
		{"broken file is skipped", []string{broken, single}, []ContextEntry{dev}},
		{"missing file yields nothing", []string{filepath.Join(dir, "does_not_exist.yaml")}, nil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Contexts(kubeconfigEnv(tt.files...), "/nonexistent-home")
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("Contexts() = %v, want %v", got, tt.want)
			}
		})
	}
}

// Fields absent from the kubeconfig stay empty (blank table cells later).
func TestContextsMissingFields(t *testing.T) {
	path := writeTemp(t, noCurrentConfig) // kind-1 has a cluster but no user/namespace

	got := Contexts(kubeconfigEnv(path), "/nonexistent-home")
	want := []ContextEntry{{Name: "kind-1", Cluster: "kind-1"}}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("Contexts() = %v, want %v", got, want)
	}
}

// Switching must change exactly the current-context line; every other byte,
// including comments, survives.
func TestWriteContextSurgical(t *testing.T) {
	path := writeTemp(t, kindConfig)

	if err := WriteContext(kubeconfigEnv(path), "/nonexistent-home", "kind-2"); err != nil {
		t.Fatalf("WriteContext: %v", err)
	}

	got, _ := os.ReadFile(path)
	want := strings.Replace(kindConfig, "current-context: kind-1", "current-context: kind-2", 1)
	if string(got) != want {
		t.Errorf("file after switch:\n%s\nwant:\n%s", got, want)
	}
}

// A file without a current-context line gains one; the rest is unchanged.
func TestWriteContextAppendsWhenMissing(t *testing.T) {
	path := writeTemp(t, noCurrentConfig)

	if err := WriteContext(kubeconfigEnv(path), "/nonexistent-home", "kind-1"); err != nil {
		t.Fatalf("WriteContext: %v", err)
	}

	got, _ := os.ReadFile(path)
	want := noCurrentConfig + "current-context: kind-1\n"
	if string(got) != want {
		t.Errorf("file after append:\n%s\nwant:\n%s", got, want)
	}
}

func TestWriteContextTargetSelection(t *testing.T) {
	t.Run("first file that sets current-context wins", func(t *testing.T) {
		first := writeTemp(t, noCurrentConfig) // no current-context
		second := writeTemp(t, kindConfig)     // owns current-context

		if err := WriteContext(kubeconfigEnv(first, second), "/nonexistent-home", "kind-2"); err != nil {
			t.Fatalf("WriteContext: %v", err)
		}

		gotFirst, _ := os.ReadFile(first)
		if string(gotFirst) != noCurrentConfig {
			t.Errorf("first file must stay byte-identical:\n%s", gotFirst)
		}
		gotSecond, _ := os.ReadFile(second)
		if !strings.Contains(string(gotSecond), "current-context: kind-2") {
			t.Errorf("second file must be updated:\n%s", gotSecond)
		}
	})

	t.Run("no file sets current-context: first file gains the line", func(t *testing.T) {
		first := writeTemp(t, noCurrentConfig)
		second := writeTemp(t, noCurrentConfig)

		if err := WriteContext(kubeconfigEnv(first, second), "/nonexistent-home", "kind-1"); err != nil {
			t.Fatalf("WriteContext: %v", err)
		}

		gotFirst, _ := os.ReadFile(first)
		if !strings.Contains(string(gotFirst), "current-context: kind-1") {
			t.Errorf("first file must gain the line:\n%s", gotFirst)
		}
		gotSecond, _ := os.ReadFile(second)
		if string(gotSecond) != noCurrentConfig {
			t.Errorf("second file must stay byte-identical:\n%s", gotSecond)
		}
	})
}

func TestWriteContextRefusesUnsafeTargets(t *testing.T) {
	t.Run("broken YAML is never modified", func(t *testing.T) {
		broken := "{ this is : not [ valid yaml\n"
		path := writeTemp(t, broken)

		if err := WriteContext(kubeconfigEnv(path), "/nonexistent-home", "kind-1"); err == nil {
			t.Fatal("WriteContext must refuse an unparsable target")
		}
		got, _ := os.ReadFile(path)
		if string(got) != broken {
			t.Errorf("broken file must stay byte-identical:\n%s", got)
		}
	})

	t.Run("missing file is an error", func(t *testing.T) {
		path := filepath.Join(t.TempDir(), "nope")
		if err := WriteContext(kubeconfigEnv(path), "/nonexistent-home", "kind-1"); err == nil {
			t.Fatal("WriteContext must refuse a missing target")
		}
	})
}

func TestWriteContextPreservesPermissions(t *testing.T) {
	path := writeTemp(t, kindConfig) // written with 0600

	if err := WriteContext(kubeconfigEnv(path), "/nonexistent-home", "kind-2"); err != nil {
		t.Fatalf("WriteContext: %v", err)
	}
	fi, err := os.Stat(path)
	if err != nil {
		t.Fatal(err)
	}
	if perm := fi.Mode().Perm(); perm != 0o600 {
		t.Errorf("permissions = %o, want 0600", perm)
	}
}

func TestCheck(t *testing.T) {
	dir := fixtures(t)
	broken := filepath.Join(dir, "kubeconfig_broken.yaml")
	single := filepath.Join(dir, "kubeconfig_single.yaml")

	t.Run("broken among readable is named", func(t *testing.T) {
		got := Check(kubeconfigEnv(broken, single), "/nonexistent-home")
		if len(got) != 1 || !strings.Contains(got[0], "kubeconfig_broken.yaml") {
			t.Errorf("Check() = %v, want one warning naming the broken file", got)
		}
	})
	t.Run("healthy files are quiet", func(t *testing.T) {
		if got := Check(kubeconfigEnv(single), "/nonexistent-home"); got != nil {
			t.Errorf("Check() = %v, want nil", got)
		}
	})
	t.Run("missing file is normal, no warning", func(t *testing.T) {
		if got := Check(kubeconfigEnv(filepath.Join(dir, "nope.yaml")), "/nonexistent-home"); got != nil {
			t.Errorf("Check() = %v, want nil", got)
		}
	})
}
