// Package kube reads the current kube-context and namespace directly from
// kubeconfig files, without shelling out to kubectl or making network calls.
//
// It honors $KUBECONFIG (a colon-separated list of files) and falls back to
// ~/.kube/config. Every failure mode (missing file, broken YAML, missing
// context) is graceful: it yields an empty Info so the prompt is never broken.
package kube

import (
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

// Info holds the resolved kube-context and its namespace. Either field may be
// empty when the corresponding value is unavailable.
type Info struct {
	Context   string
	Namespace string
}

// kubeFile is a minimal projection of a kubeconfig. We intentionally decode
// only the fields we need instead of the whole document.
type kubeFile struct {
	CurrentContext string `yaml:"current-context"`
	Contexts       []struct {
		Name    string `yaml:"name"`
		Context struct {
			Cluster   string `yaml:"cluster"`
			User      string `yaml:"user"`
			Namespace string `yaml:"namespace"`
		} `yaml:"context"`
	} `yaml:"contexts"`
}

// LookupEnv mirrors os.LookupEnv and is injected for testability.
type LookupEnv func(string) (string, bool)

// Read resolves the kubeconfig file list and returns the current context and
// its namespace. home is used to build the default ~/.kube/config path.
//
// Merge rules (per spec):
//   - current-context: the first file in the list with a non-empty
//     current-context wins.
//   - namespace: the contexts[] entry matching current-context is searched
//     across all files in the list (first match wins).
func Read(lookupEnv LookupEnv, home string) Info {
	files := resolveFiles(lookupEnv, home)
	parsed := make([]kubeFile, 0, len(files))
	for _, f := range files {
		kf, ok := parseFile(f)
		if !ok {
			continue
		}
		parsed = append(parsed, kf)
	}

	var info Info
	for _, kf := range parsed {
		if kf.CurrentContext != "" {
			info.Context = kf.CurrentContext
			break
		}
	}
	if info.Context == "" {
		return Info{}
	}

	for _, kf := range parsed {
		for _, c := range kf.Contexts {
			if c.Name == info.Context {
				info.Namespace = c.Context.Namespace
				return info
			}
		}
	}
	return info
}

// resolveFiles returns the ordered list of kubeconfig paths to inspect.
func resolveFiles(lookupEnv LookupEnv, home string) []string {
	if v, ok := lookupEnv("KUBECONFIG"); ok && v != "" {
		// The spec says "split by colon"; we use os.PathListSeparator, which is
		// ':' on the supported platforms (linux/macOS) and is the conventional,
		// portable choice. Windows (';') is explicitly out of scope.
		parts := strings.Split(v, string(os.PathListSeparator))
		files := make([]string, 0, len(parts))
		for _, p := range parts {
			p = strings.TrimSpace(p)
			if p != "" {
				files = append(files, p)
			}
		}
		if len(files) > 0 {
			return files
		}
	}
	return []string{filepath.Join(home, ".kube", "config")}
}

// parseFile reads and decodes a single kubeconfig file. It returns ok=false on
// any error (missing file, no permission, broken YAML).
func parseFile(path string) (kubeFile, bool) {
	data, err := os.ReadFile(path)
	if err != nil {
		return kubeFile{}, false
	}
	var kf kubeFile
	if err := yaml.Unmarshal(data, &kf); err != nil {
		return kubeFile{}, false
	}
	return kf, true
}
