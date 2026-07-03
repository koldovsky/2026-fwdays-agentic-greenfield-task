// Package aws reads the active AWS profile and region offline from ~/.aws/config
// and the environment, without the AWS SDK or any network call.
//
// account-id is intentionally out of scope (it requires STS / network). All
// failure modes are graceful: an empty Reading so the prompt is never broken.
package aws

import (
	"os"
	"path/filepath"
	"strings"

	"omnictx/internal/cloud"
	"omnictx/internal/ini"
)

// LookupEnv mirrors os.LookupEnv (aliased from cloud for a single definition).
type LookupEnv = cloud.LookupEnv

// Provider implements cloud.Provider for AWS.
type Provider struct{}

// New returns the AWS provider.
func New() Provider { return Provider{} }

// Key identifies the provider.
func (Provider) Key() string { return "aws" }

// Label is the segment prefix: the AWS Nerd Font glyph, or the ASCII "aws:".
func (Provider) Label(icons bool) string {
	if icons {
		return cloud.IconAWS
	}
	return "aws:"
}

// Present reports whether there is any local AWS signal, used by auto-detection.
func (Provider) Present(lookup LookupEnv, home string) bool {
	return present(lookup, home)
}

// Read resolves "profile" (+ "/region" when known). OK is gated on Present so a
// pinned-but-unconfigured AWS shows nothing rather than a bare "default".
func (Provider) Read(lookup LookupEnv, home string) cloud.Reading {
	if !present(lookup, home) {
		return cloud.Reading{}
	}
	text := resolveProfile(lookup)
	if region := resolveRegion(lookup, home, resolveProfile(lookup)); region != "" {
		text += "/" + region
	}
	return cloud.Reading{Text: text, OK: text != ""}
}

func present(lookup LookupEnv, home string) bool {
	if envSet(lookup, "AWS_PROFILE") || envSet(lookup, "AWS_VAULT") ||
		envSet(lookup, "AWS_REGION") || envSet(lookup, "AWS_DEFAULT_REGION") {
		return true
	}
	return fileExists(configPath(lookup, home)) ||
		fileExists(filepath.Join(home, ".aws", "credentials"))
}

// resolveProfile: AWS_PROFILE > AWS_VAULT > "default".
func resolveProfile(lookup LookupEnv) string {
	if v, ok := lookup("AWS_PROFILE"); ok && v != "" {
		return v
	}
	if v, ok := lookup("AWS_VAULT"); ok && v != "" {
		return v
	}
	return "default"
}

// resolveRegion: AWS_REGION > AWS_DEFAULT_REGION > the profile's region in
// ~/.aws/config.
func resolveRegion(lookup LookupEnv, home, profile string) string {
	if v, ok := lookup("AWS_REGION"); ok && v != "" {
		return v
	}
	if v, ok := lookup("AWS_DEFAULT_REGION"); ok && v != "" {
		return v
	}
	f, ok := ini.ParseFile(configPath(lookup, home))
	if !ok {
		return ""
	}
	if v, ok := f.Get(sectionFor(profile), "region"); ok {
		return v
	}
	return ""
}

// Profile is one entry of `cloud aws list`: a profile name plus its region
// from ~/.aws/config (empty when the config does not set one).
type Profile struct {
	Name   string
	Region string
}

// Profiles lists locally configured profiles: the sections of ~/.aws/config
// (with the "profile " prefix stripped) followed by names that exist only in
// ~/.aws/credentials, deduplicated, in file order. Regions come from the
// config file only — credential values are never read. Missing or unparsable
// files degrade to an empty (or partial) list.
func Profiles(lookup LookupEnv, home string) []Profile {
	var profiles []Profile
	seen := map[string]bool{}

	add := func(name string) {
		if name == "" || seen[name] {
			return
		}
		seen[name] = true
		profiles = append(profiles, Profile{Name: name})
	}

	cfg := ini.File{}
	if data, err := os.ReadFile(configPath(lookup, home)); err == nil {
		cfg = ini.Parse(data)
		for _, section := range ini.Sections(data) {
			switch {
			case section == "default":
				add("default")
			case strings.HasPrefix(section, "profile "):
				add(strings.TrimSpace(strings.TrimPrefix(section, "profile ")))
			}
			// Other section kinds (e.g. [sso-session ...]) are not profiles.
		}
	}
	if data, err := os.ReadFile(filepath.Join(home, ".aws", "credentials")); err == nil {
		// Credentials sections are bare profile names; only names are used.
		for _, section := range ini.Sections(data) {
			add(section)
		}
	}

	for i := range profiles {
		if v, ok := cfg.Get(sectionFor(profiles[i].Name), "region"); ok {
			profiles[i].Region = v
		}
	}
	return profiles
}

// CurrentProfile exposes the active-profile resolution (AWS_PROFILE >
// AWS_VAULT > "default") for the list view's CURRENT marker.
func CurrentProfile(lookup LookupEnv) string {
	return resolveProfile(lookup)
}

// sectionFor maps a profile to its ~/.aws/config section: the default profile is
// "[default]"; every other profile is "[profile NAME]".
func sectionFor(profile string) string {
	if profile == "default" {
		return "default"
	}
	return "profile " + profile
}

// configPath honors AWS_CONFIG_FILE, else ~/.aws/config.
func configPath(lookup LookupEnv, home string) string {
	if v, ok := lookup("AWS_CONFIG_FILE"); ok && v != "" {
		return v
	}
	return filepath.Join(home, ".aws", "config")
}

func envSet(lookup LookupEnv, key string) bool {
	v, ok := lookup(key)
	return ok && v != ""
}

func fileExists(p string) bool {
	info, err := os.Stat(p)
	return err == nil && !info.IsDir()
}
