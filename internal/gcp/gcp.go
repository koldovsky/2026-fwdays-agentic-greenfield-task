// Package gcp reads the active gcloud configuration's project offline from
// ~/.config/gcloud and the environment, without the Cloud SDK or any network
// call.
//
// The account email is intentionally out of scope. All failure modes are
// graceful: an empty Reading so the prompt is never broken.
package gcp

import (
	"fmt"
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

// Configuration is one entry of `cloud gcp list`: a gcloud configuration name
// plus its [core] account and project (empty when absent).
type Configuration struct {
	Name    string
	Account string
	Project string
}

// Configurations lists the local gcloud configurations: one row per
// configurations/config_<name> file under the gcloud dir, in directory order.
// A missing dir or unparsable file degrades to an empty (or partial) list.
func Configurations(lookup LookupEnv, home string) []Configuration {
	dir := gcloudDir(lookup, home)
	entries, err := os.ReadDir(filepath.Join(dir, "configurations"))
	if err != nil {
		return nil
	}

	var configs []Configuration
	for _, e := range entries {
		name, ok := strings.CutPrefix(e.Name(), "config_")
		if !ok || name == "" || e.IsDir() {
			continue
		}
		c := Configuration{Name: name}
		if f, ok := ini.ParseFile(filepath.Join(dir, "configurations", e.Name())); ok {
			c.Account, _ = f.Get("core", "account")
			c.Project, _ = f.Get("core", "project")
		}
		configs = append(configs, c)
	}
	return configs
}

// CurrentConfiguration exposes the active-config resolution for the list
// view's CURRENT marker.
func CurrentConfiguration(lookup LookupEnv, home string) string {
	return activeConfigName(lookup, gcloudDir(lookup, home))
}

// UnknownConfigError reports a `use` target that matches no local gcloud
// configuration; Available carries the names for the error message.
type UnknownConfigError struct {
	Name      string
	Available []string
}

func (e *UnknownConfigError) Error() string {
	return fmt.Sprintf("unknown gcloud configuration %q (available: %s)", e.Name, strings.Join(e.Available, ", "))
}

// Use activates the named gcloud configuration by writing <gcloud>/active_config
// — the same single-line file `gcloud config configurations activate` writes.
// The name must match an existing configurations/config_<name> file; nothing is
// written otherwise. The write is atomic (same-dir temp + rename). Note that
// CLOUDSDK_ACTIVE_CONFIG_NAME still overrides the file per-session.
func Use(lookup LookupEnv, home, name string) error {
	configs := Configurations(lookup, home)
	names := make([]string, len(configs))
	found := false
	for i, c := range configs {
		names[i] = c.Name
		if c.Name == name {
			found = true
		}
	}
	if !found {
		return &UnknownConfigError{Name: name, Available: names}
	}

	path := filepath.Join(gcloudDir(lookup, home), "active_config")
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
	if _, err := tmp.WriteString(name); err != nil {
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
