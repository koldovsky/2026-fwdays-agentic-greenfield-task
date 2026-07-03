// Package azure reads the active Azure subscription name directly from
// azureProfile.json, without shelling out to `az` or making network calls.
//
// All failure modes (missing file, broken JSON, no default subscription) are
// graceful: they return an empty string so the prompt is never broken.
package azure

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"omnictx/internal/cloud"
)

// utf8BOM is the byte-order mark that azureProfile.json is (in)famously written
// with. It must be stripped before JSON parsing.
var utf8BOM = []byte{0xEF, 0xBB, 0xBF}

// profile is a minimal projection of azureProfile.json.
type profile struct {
	Subscriptions []Subscription `json:"subscriptions"`
}

// Subscription is one entry of azureProfile.json as shown by
// `cloud azure list`. State is empty in older/partial files.
type Subscription struct {
	Name      string `json:"name"`
	ID        string `json:"id"`
	State     string `json:"state"`
	IsDefault bool   `json:"isDefault"`
}

// LookupEnv mirrors os.LookupEnv and is injected for testability.
type LookupEnv = cloud.LookupEnv

// Provider implements cloud.Provider for Azure.
type Provider struct{}

// New returns the Azure provider.
func New() Provider { return Provider{} }

// Key identifies the provider.
func (Provider) Key() string { return "azure" }

// Label is the segment prefix: the Azure Nerd Font glyph, or the ASCII "az:".
func (Provider) Label(icons bool) string {
	if icons {
		return cloud.IconAzure
	}
	return "az:"
}

// Present reports whether azureProfile.json exists, used by auto-detection.
func (Provider) Present(lookup LookupEnv, home string) bool {
	info, err := os.Stat(resolvePath(lookup, home))
	return err == nil && !info.IsDir()
}

// Read returns the active subscription as a cloud.Reading.
func (Provider) Read(lookup LookupEnv, home string) cloud.Reading {
	name := Read(lookup, home)
	return cloud.Reading{Text: name, OK: name != ""}
}

// Read returns the name of the default (active) Azure subscription, or an empty
// string when it cannot be determined. home is used to build the default
// ~/.azure/azureProfile.json path when AZURE_CONFIG_DIR is not set.
func Read(lookupEnv LookupEnv, home string) string {
	for _, s := range Subscriptions(lookupEnv, home) {
		if s.IsDefault {
			return s.Name
		}
	}
	return ""
}

// Subscriptions lists every subscription in azureProfile.json (BOM-aware), in
// file order. Missing or broken files degrade to an empty list.
func Subscriptions(lookupEnv LookupEnv, home string) []Subscription {
	data, err := os.ReadFile(resolvePath(lookupEnv, home))
	if err != nil {
		return nil
	}
	data = bytes.TrimPrefix(data, utf8BOM)

	var p profile
	if err := json.Unmarshal(data, &p); err != nil {
		return nil
	}
	return p.Subscriptions
}

// Check probes azureProfile.json for problems worth telling an interactive
// user about: a file that exists but cannot be parsed. A missing file is a
// normal state (not logged in) and produces no warning. Render mode never
// calls this — the prompt stays silent by design.
func Check(lookupEnv LookupEnv, home string) []string {
	path := resolvePath(lookupEnv, home)
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	var p profile
	if err := json.Unmarshal(bytes.TrimPrefix(data, utf8BOM), &p); err != nil {
		return []string{fmt.Sprintf("%s is unparsable: %v", path, err)}
	}
	return nil
}

// UnknownAccountError reports a `use` target that matches no subscription.
type UnknownAccountError struct {
	Target    string
	Available []string // "name (id)" strings for the error message
}

func (e *UnknownAccountError) Error() string {
	return fmt.Sprintf("unknown Azure subscription %q (available: %s)", e.Target, strings.Join(e.Available, ", "))
}

// AmbiguousAccountError reports a `use` target that matches several
// subscriptions by display name; the id must be used instead.
type AmbiguousAccountError struct {
	Target  string
	Matches []string // "name (id)" strings of the colliding entries
}

func (e *AmbiguousAccountError) Error() string {
	return fmt.Sprintf("subscription name %q is ambiguous, use the id instead: %s", e.Target, strings.Join(e.Matches, ", "))
}

// Use makes the subscription matching target (exact name, or id compared
// case-insensitively) the default one, like `az account set`. azureProfile.json
// is a file omnictx does not own, so the rewrite is conservative:
//
//   - parse-before-write: an unreadable/unparsable file is never touched;
//   - the whole document round-trips through generic maps — JSON has no
//     comments, so every field survives (only key order/whitespace normalize);
//   - a leading UTF-8 BOM is preserved when the original has one;
//   - the write is atomic (same-dir temp + rename, permission bits kept).
func Use(lookupEnv LookupEnv, home, target string) error {
	path := resolvePath(lookupEnv, home)
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read %s: %w", path, err)
	}
	hadBOM := bytes.HasPrefix(data, utf8BOM)
	data = bytes.TrimPrefix(data, utf8BOM)

	var doc map[string]any
	if err := json.Unmarshal(data, &doc); err != nil {
		return fmt.Errorf("refusing to modify unparsable %s: %v", path, err)
	}
	subs, _ := doc["subscriptions"].([]any)

	var matches, available []string
	var matchIdx []int
	for i, s := range subs {
		m, ok := s.(map[string]any)
		if !ok {
			continue
		}
		name, _ := m["name"].(string)
		id, _ := m["id"].(string)
		entry := fmt.Sprintf("%s (%s)", name, id)
		available = append(available, entry)
		if name == target || strings.EqualFold(id, target) {
			matchIdx = append(matchIdx, i)
			matches = append(matches, entry)
		}
	}
	if len(matchIdx) == 0 {
		return &UnknownAccountError{Target: target, Available: available}
	}
	if len(matchIdx) > 1 {
		return &AmbiguousAccountError{Target: target, Matches: matches}
	}

	for i, s := range subs {
		if m, ok := s.(map[string]any); ok {
			m["isDefault"] = i == matchIdx[0]
		}
	}

	out, err := json.MarshalIndent(doc, "", "  ")
	if err != nil {
		return err
	}
	out = append(out, '\n')
	if hadBOM {
		out = append(append([]byte{}, utf8BOM...), out...)
	}

	mode := os.FileMode(0o644)
	if fi, err := os.Stat(path); err == nil {
		mode = fi.Mode().Perm()
	}
	tmp, err := os.CreateTemp(filepath.Dir(path), ".omnictx-*")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer func() { _ = os.Remove(tmpName) }() // no-op once renamed
	if _, err := tmp.Write(out); err != nil {
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

// resolvePath returns the azureProfile.json path, honoring AZURE_CONFIG_DIR.
func resolvePath(lookupEnv LookupEnv, home string) string {
	if dir, ok := lookupEnv("AZURE_CONFIG_DIR"); ok && dir != "" {
		return filepath.Join(dir, "azureProfile.json")
	}
	return filepath.Join(home, ".azure", "azureProfile.json")
}
