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
)

// utf8BOM is the byte-order mark that azureProfile.json is (in)famously written
// with. It must be stripped before JSON parsing.
var utf8BOM = []byte{0xEF, 0xBB, 0xBF}

// profile is a minimal projection of azureProfile.json.
type profile struct {
	Subscriptions []struct {
		Name      string `json:"name"`
		IsDefault bool   `json:"isDefault"`
	} `json:"subscriptions"`
}

// LookupEnv mirrors os.LookupEnv and is injected for testability.
type LookupEnv func(string) (string, bool)

// Read returns the name of the default (active) Azure subscription, or an empty
// string when it cannot be determined. home is used to build the default
// ~/.azure/azureProfile.json path when AZURE_CONFIG_DIR is not set.
func Read(lookupEnv LookupEnv, home string) string {
	path := resolvePath(lookupEnv, home)
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	data = bytes.TrimPrefix(data, utf8BOM)

	var p profile
	if err := json.Unmarshal(data, &p); err != nil {
		return ""
	}
	for _, s := range p.Subscriptions {
		if s.IsDefault {
			return s.Name
		}
	}
	return ""
}

// resolvePath returns the azureProfile.json path, honoring AZURE_CONFIG_DIR.
func resolvePath(lookupEnv LookupEnv, home string) string {
	if dir, ok := lookupEnv("AZURE_CONFIG_DIR"); ok && dir != "" {
		return filepath.Join(dir, "azureProfile.json")
	}
	return filepath.Join(home, ".azure", "azureProfile.json")
}
