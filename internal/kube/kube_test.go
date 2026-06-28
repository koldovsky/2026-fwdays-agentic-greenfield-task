package kube

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func fixtures(t *testing.T) string {
	t.Helper()
	return filepath.Join("..", "..", "testdata")
}

// envFunc returns a LookupEnv backed by the given map.
func envFunc(m map[string]string) LookupEnv {
	return func(k string) (string, bool) {
		v, ok := m[k]
		return v, ok
	}
}

func TestRead(t *testing.T) {
	dir := fixtures(t)
	join := func(names ...string) string {
		paths := make([]string, len(names))
		for i, n := range names {
			paths[i] = filepath.Join(dir, n)
		}
		return strings.Join(paths, string(os.PathListSeparator))
	}

	tests := []struct {
		name        string
		kubeconfig  string
		wantContext string
		wantNS      string
	}{
		{
			name:        "single file with namespace",
			kubeconfig:  join("kubeconfig_single.yaml"),
			wantContext: "dev",
			wantNS:      "payments",
		},
		{
			name:        "context without namespace",
			kubeconfig:  join("kubeconfig_no_namespace.yaml"),
			wantContext: "staging",
			wantNS:      "",
		},
		{
			name:        "empty current-context yields nothing",
			kubeconfig:  join("kubeconfig_no_current.yaml"),
			wantContext: "",
			wantNS:      "",
		},
		{
			name:        "KUBECONFIG merge: current-context from first, namespace from second",
			kubeconfig:  join("kubeconfig_a.yaml", "kubeconfig_b.yaml"),
			wantContext: "team-a",
			wantNS:      "gamma",
		},
		{
			name:        "broken YAML is skipped gracefully",
			kubeconfig:  join("kubeconfig_broken.yaml"),
			wantContext: "",
			wantNS:      "",
		},
		{
			name:        "missing file yields nothing",
			kubeconfig:  join("does_not_exist.yaml"),
			wantContext: "",
			wantNS:      "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Read(envFunc(map[string]string{"KUBECONFIG": tt.kubeconfig}), "/nonexistent-home")
			if got.Context != tt.wantContext || got.Namespace != tt.wantNS {
				t.Fatalf("Read() = %+v, want context=%q namespace=%q", got, tt.wantContext, tt.wantNS)
			}
		})
	}
}

func TestReadDefaultPath(t *testing.T) {
	// With no KUBECONFIG set and a home that lacks ~/.kube/config, Read must
	// return an empty Info rather than error.
	home := t.TempDir()
	got := Read(envFunc(map[string]string{}), home)
	if got.Context != "" || got.Namespace != "" {
		t.Fatalf("Read() = %+v, want empty", got)
	}
}

func TestReadDefaultPathHonored(t *testing.T) {
	// When KUBECONFIG is unset, Read must look at <home>/.kube/config.
	home := t.TempDir()
	kubeDir := filepath.Join(home, ".kube")
	if err := os.MkdirAll(kubeDir, 0o755); err != nil {
		t.Fatal(err)
	}
	src, err := os.ReadFile(filepath.Join(fixtures(t), "kubeconfig_single.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(kubeDir, "config"), src, 0o644); err != nil {
		t.Fatal(err)
	}
	got := Read(envFunc(map[string]string{}), home)
	if got.Context != "dev" || got.Namespace != "payments" {
		t.Fatalf("Read() = %+v, want dev/payments", got)
	}
}
