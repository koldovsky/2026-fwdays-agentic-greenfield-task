// Package cloud defines the provider abstraction for the single "active cloud"
// prompt segment and the logic that selects which provider is active
// (explicit pin / auto-detect / none).
//
// Only ever ONE cloud is shown. Providers read their state offline from local
// files and the environment; any failure yields an empty Reading so the prompt
// is never broken.
package cloud

// Per-provider Nerd Font glyphs shown in icon mode.
const (
	IconAzure = "󰠅 " // nf-md-microsoft_azure
	IconAWS   = " " // nf-dev-aws U+E7AD
	IconGCP   = "󱇶 " // nf-md-google_cloud
)

// Selection values understood by Select in addition to the provider keys
// ("azure" | "aws" | "gcp").
const (
	Auto = "auto"
	None = "none"
)

// LookupEnv mirrors os.LookupEnv and is injected for testability.
type LookupEnv func(string) (string, bool)

// Reading is a provider's resolved value. OK=false means "nothing to show"
// (missing config, not logged in); the cloud segment is then skipped.
type Reading struct {
	Text string
	OK   bool
}

// Provider reads one cloud's active context offline from local files/env.
type Provider interface {
	Key() string                                // "azure" | "aws" | "gcp"
	Label(icons bool) string                    // Nerd Font glyph or ASCII "az:"/"aws:"/"gcp:"
	Present(lookup LookupEnv, home string) bool // used by `auto` detection
	Read(lookup LookupEnv, home string) Reading
}

// Select resolves the active provider for the given choice.
//
//   - None                  -> no active cloud.
//   - "azure"/"aws"/"gcp"   -> that provider, pinned. It is returned even when
//     its config is absent; a pinned-but-empty provider simply yields an empty
//     Reading later (so the segment is skipped, never an error).
//   - Auto (or any unknown) -> the first provider, in the given priority order,
//     whose config is Present.
//
// providers is the priority-ordered list (the caller passes azure, aws, gcp).
func Select(providers []Provider, choice string, lookup LookupEnv, home string) (Provider, bool) {
	switch choice {
	case None:
		return nil, false
	case Auto:
		// fall through to auto-detection below.
	default:
		for _, p := range providers {
			if p.Key() == choice {
				return p, true
			}
		}
		// Unknown choice: behave like Auto.
	}

	for _, p := range providers {
		if p.Present(lookup, home) {
			return p, true
		}
	}
	return nil, false
}
