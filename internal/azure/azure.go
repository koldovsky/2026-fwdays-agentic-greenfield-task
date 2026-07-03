// Package azure reads the active Azure subscription name directly from
// azureProfile.json, without shelling out to `az` or making network calls.
//
// All failure modes (missing file, broken JSON, no default subscription) are
// graceful: they return an empty string so the prompt is never broken.
package azure

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"

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

// resolvePath returns the azureProfile.json path, honoring AZURE_CONFIG_DIR.
func resolvePath(lookupEnv LookupEnv, home string) string {
	if dir, ok := lookupEnv("AZURE_CONFIG_DIR"); ok && dir != "" {
		return filepath.Join(dir, "azureProfile.json")
	}
	return filepath.Join(home, ".azure", "azureProfile.json")
}
