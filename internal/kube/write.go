package kube

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

// ContextEntry is one context as listed by `kube list`: the name plus the
// cluster/user/namespace columns of the kubectl get-contexts table. Fields
// absent from the kubeconfig are empty strings.
type ContextEntry struct {
	Name      string
	Cluster   string
	AuthInfo  string
	Namespace string
}

// Contexts returns every context found across the kubeconfig file list,
// deduplicated by name (first definition wins), in file-then-definition
// order. Broken or missing files are skipped, mirroring Read.
func Contexts(lookup LookupEnv, home string) []ContextEntry {
	var entries []ContextEntry
	seen := map[string]bool{}
	for _, f := range resolveFiles(lookup, home) {
		kf, ok := parseFile(f)
		if !ok {
			continue
		}
		for _, c := range kf.Contexts {
			if c.Name == "" || seen[c.Name] {
				continue
			}
			seen[c.Name] = true
			entries = append(entries, ContextEntry{
				Name:      c.Name,
				Cluster:   c.Context.Cluster,
				AuthInfo:  c.Context.User,
				Namespace: c.Context.Namespace,
			})
		}
	}
	return entries
}

// Check probes the kubeconfig file list for problems worth telling an
// interactive user about: files that exist but cannot be parsed. Missing
// files are a normal state and produce no warning. Render mode never calls
// this — the prompt stays silent by design.
func Check(lookup LookupEnv, home string) []string {
	var problems []string
	for _, f := range resolveFiles(lookup, home) {
		data, err := os.ReadFile(f)
		if err != nil {
			continue
		}
		var kf kubeFile
		if err := yaml.Unmarshal(data, &kf); err != nil {
			problems = append(problems, fmt.Sprintf("%s is unparsable: %v", f, err))
		}
	}
	return problems
}

// writeTarget picks the file that owns current-context: the first file in the
// list that sets a non-empty value, else the first file. This mirrors both the
// Read merge rule and kubectl's behavior, so a switch is always visible to the
// next Read.
func writeTarget(files []string) string {
	for _, f := range files {
		if kf, ok := parseFile(f); ok && kf.CurrentContext != "" {
			return f
		}
	}
	return files[0]
}

// WriteContext sets `current-context: <context>` in the kubeconfig chosen by
// writeTarget. The kubeconfig is a file omnictx does not own, so the edit is
// deliberately conservative:
//
//   - parse-before-write: a file that cannot be read or parsed is never touched;
//   - single-line surgery on the top-level current-context: line (appended when
//     absent) — every other byte, including comments, is preserved;
//   - atomic replace: temp file in the same directory with the original
//     permission bits, then rename.
//
// Validating that the context exists is the caller's job (see Contexts).
func WriteContext(lookup LookupEnv, home, context string) error {
	target := writeTarget(resolveFiles(lookup, home))

	data, err := os.ReadFile(target)
	if err != nil {
		return fmt.Errorf("read %s: %w", target, err)
	}
	var kf kubeFile
	if err := yaml.Unmarshal(data, &kf); err != nil {
		return fmt.Errorf("refusing to modify unparsable %s: %v", target, err)
	}

	newLine := "current-context: " + context
	lines := strings.Split(string(data), "\n")
	replaced := false
	for i, l := range lines {
		// Column-0 prefix only: an indented current-context: belongs to some
		// nested block, never to the document root.
		if strings.HasPrefix(l, "current-context:") {
			lines[i] = newLine
			replaced = true
			break
		}
	}
	out := strings.Join(lines, "\n")
	if !replaced {
		if out != "" && !strings.HasSuffix(out, "\n") {
			out += "\n"
		}
		out += newLine + "\n"
	}

	return atomicWrite(target, out)
}

// atomicWrite replaces path with content via a same-directory temp file and
// rename, preserving the original permission bits (kubeconfigs are usually
// 0600). A failure at any step leaves the original file untouched.
func atomicWrite(path, content string) error {
	mode := os.FileMode(0o600)
	if fi, err := os.Stat(path); err == nil {
		mode = fi.Mode().Perm()
	}

	tmp, err := os.CreateTemp(filepath.Dir(path), ".omnictx-*")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer func() { _ = os.Remove(tmpName) }() // no-op once renamed

	if _, err := tmp.WriteString(content); err != nil {
		_ = tmp.Close()
		return err
	}
	if err := tmp.Chmod(mode); err != nil {
		_ = tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmpName, path)
}
