// Package gcp reads the active gcloud configuration's project offline from
// ~/.config/gcloud and the environment, without the Cloud SDK or any network
// call.
//
// The account email is intentionally out of scope. All failure modes are
// graceful: an empty Reading so the prompt is never broken.
package gcp

import (
	"os"
	"path/filepath"
	"strings"

	"omnictx/internal/cloud"
	"omnictx/internal/ini"
)

// LookupEnv mirrors os.LookupEnv (aliased from cloud for a single definition).
type LookupEnv = cloud.LookupEnv

// Provider implements cloud.Provider for Google Cloud.
type Provider struct{}

// New returns the GCP provider.
func New() Provider { return Provider{} }

// Key identifies the provider.
func (Provider) Key() string { return "gcp" }

// Label is the segment prefix: the GCP Nerd Font glyph, or the ASCII "gcp:".
func (Provider) Label(icons bool) string {
	if icons {
		return cloud.IconGCP
	}
	return "gcp:"
}

// Present reports whether there is any local gcloud signal, for auto-detection.
func (Provider) Present(lookup LookupEnv, home string) bool {
	if envSet(lookup, "CLOUDSDK_CONFIG") || envSet(lookup, "CLOUDSDK_ACTIVE_CONFIG_NAME") ||
		envSet(lookup, "CLOUDSDK_CORE_PROJECT") || envSet(lookup, "GOOGLE_CLOUD_PROJECT") {
		return true
	}
	return dirExists(gcloudDir(lookup, home))
}

// Read resolves the active project. OK=false (empty) when no project is known.
func (Provider) Read(lookup LookupEnv, home string) cloud.Reading {
	project := resolveProject(lookup, home)
	return cloud.Reading{Text: project, OK: project != ""}
}

// resolveProject: CLOUDSDK_CORE_PROJECT > GOOGLE_CLOUD_PROJECT > the active
// configuration's [core] project.
func resolveProject(lookup LookupEnv, home string) string {
	if v, ok := lookup("CLOUDSDK_CORE_PROJECT"); ok && v != "" {
		return v
	}
	if v, ok := lookup("GOOGLE_CLOUD_PROJECT"); ok && v != "" {
		return v
	}
	dir := gcloudDir(lookup, home)
	name := activeConfigName(lookup, dir)
	f, ok := ini.ParseFile(filepath.Join(dir, "configurations", "config_"+name))
	if !ok {
		return ""
	}
	if v, ok := f.Get("core", "project"); ok {
		return v
	}
	return ""
}

// activeConfigName: CLOUDSDK_ACTIVE_CONFIG_NAME > the single line in
// <gcloud>/active_config > "default".
func activeConfigName(lookup LookupEnv, dir string) string {
	if v, ok := lookup("CLOUDSDK_ACTIVE_CONFIG_NAME"); ok && v != "" {
		return v
	}
	if data, err := os.ReadFile(filepath.Join(dir, "active_config")); err == nil {
		if s := strings.TrimSpace(string(data)); s != "" {
			return s
		}
	}
	return "default"
}

// gcloudDir honors CLOUDSDK_CONFIG, else ~/.config/gcloud.
func gcloudDir(lookup LookupEnv, home string) string {
	if v, ok := lookup("CLOUDSDK_CONFIG"); ok && v != "" {
		return v
	}
	return filepath.Join(home, ".config", "gcloud")
}

func envSet(lookup LookupEnv, key string) bool {
	v, ok := lookup(key)
	return ok && v != ""
}

func dirExists(p string) bool {
	info, err := os.Stat(p)
	return err == nil && info.IsDir()
}
