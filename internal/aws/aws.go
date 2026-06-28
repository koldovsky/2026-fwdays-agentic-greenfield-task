// Package aws reads the active AWS profile and region offline from ~/.aws/config
// and the environment, without the AWS SDK or any network call.
//
// account-id is intentionally out of scope (it requires STS / network). All
// failure modes are graceful: an empty Reading so the prompt is never broken.
package aws

import (
	"os"
	"path/filepath"

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
