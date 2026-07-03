// Package config resolves the effective omnictx configuration by merging four
// layers with a strict precedence: flag > env > config file > built-in default.
//
// Nothing here is fatal. A missing or broken config file is ignored silently
// (surfaced only as a debug note) so the prompt is never broken.
package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"gopkg.in/yaml.v3"
)

// Segment identifiers in canonical form. The cloud slot is a single segment;
// the concrete provider is chosen separately via the Cloud selection.
const (
	SegmentCloud     = "cloud"
	SegmentKube      = "kube"
	SegmentNamespace = "namespace"

	// SegmentAzure is the legacy name, kept as a color key and a segment alias.
	SegmentAzure = "azure"
)

// Cloud selection values, in addition to the provider keys azure|aws|gcp.
const (
	CloudAuto = "auto"
	CloudNone = "none"
)

// Shell escaping modes.
const (
	ShellNone = "none"
	ShellBash = "bash"
	ShellZsh  = "zsh"
)

// Config is the fully resolved configuration consumed by the renderer.
type Config struct {
	Enabled   bool
	Segments  []string
	Cloud     string // active cloud: azure|aws|gcp|auto|none
	Kube      bool   // kube-segment display toggle (namespace follows kube)
	Icons     bool
	Separator string
	Shell     string
	Colors    map[string]string
	// Aliases maps provider -> short alias -> canonical account (subscription
	// name/id for azure, configuration name for gcp). Config-file only.
	Aliases map[string]map[string]string
}

// Flags holds raw command-line flag values. Pointer fields are nil when the
// flag was not provided, which is what lets flags sit at the top of the
// precedence chain without clobbering lower layers.
type Flags struct {
	Shell *string
}

// LookupEnv mirrors os.LookupEnv and is injected for testability.
type LookupEnv func(string) (string, bool)

// fileConfig is the on-disk YAML model. Pointer fields distinguish "absent"
// from "zero value" so the layer only overrides what it actually specifies.
type fileConfig struct {
	Enabled   *bool             `yaml:"enabled"`
	Segments  []string          `yaml:"segments"`
	Cloud     *string           `yaml:"cloud"`
	Kube      *bool             `yaml:"kube"`
	Icons     *bool                        `yaml:"icons"`
	Separator *string                      `yaml:"separator"`
	Colors    map[string]string            `yaml:"colors"`
	Aliases   map[string]map[string]string `yaml:"aliases"`
}

// Defaults returns the built-in configuration used when nothing overrides it.
func Defaults() Config {
	return Config{
		Enabled:   true,
		Segments:  []string{SegmentCloud, SegmentKube, SegmentNamespace},
		Cloud:     CloudAuto,
		Kube:      true,
		Icons:     true,
		Separator: " ",
		Shell:     ShellNone,
		Colors: map[string]string{
			SegmentCloud:     "blue",
			SegmentKube:      "cyan",
			SegmentNamespace: "dim",
		},
	}
}

// Resolve merges all layers and returns the effective Config plus a slice of
// human-readable debug notes (only meaningful when --debug is set). It never
// returns an error: every failure degrades gracefully to a lower layer.
func Resolve(flags Flags, lookupEnv LookupEnv, home string) (Config, []string) {
	var debug []string
	cfg := Defaults()

	// Layer 1: config file (lowest above defaults).
	path := resolveConfigPath(lookupEnv, home)
	if fc, note, ok := loadFile(path); ok {
		applyFile(&cfg, fc)
	} else if note != "" {
		debug = append(debug, note)
	}

	// Layer 2: environment variables.
	applyEnv(&cfg, lookupEnv, &debug)

	// Layer 3: flags (highest).
	applyFlags(&cfg, flags)

	cfg.Segments = normalizeSegments(cfg.Segments)

	cfg.Shell = normalizeShell(cfg.Shell)
	cfg.Cloud = normalizeCloud(cfg.Cloud)

	return cfg, debug
}

// resolveConfigPath applies precedence (env > default) to the config path.
func resolveConfigPath(lookupEnv LookupEnv, home string) string {
	if v, ok := lookupEnv("OMNICTX_CONFIG"); ok && v != "" {
		return v
	}
	return filepath.Join(home, ".config", "omnictx", "config.yaml")
}

// loadFile reads and parses the YAML config file. ok=false means "no usable
// config" (missing or broken); note carries a debug message in that case.
func loadFile(path string) (fileConfig, string, bool) {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return fileConfig{}, "", false
		}
		return fileConfig{}, fmt.Sprintf("config: cannot read %s: %v", path, err), false
	}
	var fc fileConfig
	if err := yaml.Unmarshal(data, &fc); err != nil {
		return fileConfig{}, fmt.Sprintf("config: ignoring broken %s: %v", path, err), false
	}
	return fc, "", true
}

func applyFile(cfg *Config, fc fileConfig) {
	if fc.Enabled != nil {
		cfg.Enabled = *fc.Enabled
	}
	if fc.Segments != nil {
		cfg.Segments = fc.Segments
	}
	if fc.Cloud != nil {
		cfg.Cloud = *fc.Cloud
	}
	if fc.Kube != nil {
		cfg.Kube = *fc.Kube
	}
	if fc.Icons != nil {
		cfg.Icons = *fc.Icons
	}
	if fc.Separator != nil {
		cfg.Separator = *fc.Separator
	}
	if fc.Colors != nil {
		// Merge per-key so a partial colors map keeps the defaults for others.
		for k, v := range fc.Colors {
			cfg.Colors[k] = v
		}
	}
	if fc.Aliases != nil {
		cfg.Aliases = fc.Aliases
	}
}

// parseBool parses a boolean env value. On top of the strconv.ParseBool forms
// it accepts on/off (case-insensitive) — matching the on/off subcommand verbs.
func parseBool(v string) (bool, error) {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "on":
		return true, nil
	case "off":
		return false, nil
	default:
		return strconv.ParseBool(strings.TrimSpace(v))
	}
}

// applyBoolEnv applies one boolean env var to dst; an invalid value is ignored
// (the lower layer wins) with a debug note.
func applyBoolEnv(lookupEnv LookupEnv, name string, dst *bool, debug *[]string) {
	v, ok := lookupEnv(name)
	if !ok {
		return
	}
	if b, err := parseBool(v); err == nil {
		*dst = b
	} else {
		*debug = append(*debug, fmt.Sprintf("env: invalid %s=%q", name, v))
	}
}

func applyEnv(cfg *Config, lookupEnv LookupEnv, debug *[]string) {
	applyBoolEnv(lookupEnv, "OMNICTX_ENABLED", &cfg.Enabled, debug)
	if v, ok := lookupEnv("OMNICTX_SEGMENTS"); ok {
		cfg.Segments = splitSegments(v)
	}
	if v, ok := lookupEnv("OMNICTX_CLOUD"); ok && v != "" {
		cfg.Cloud = v
	}
	applyBoolEnv(lookupEnv, "OMNICTX_KUBE", &cfg.Kube, debug)
	applyBoolEnv(lookupEnv, "OMNICTX_ICONS", &cfg.Icons, debug)
	if v, ok := lookupEnv("OMNICTX_SEPARATOR"); ok {
		cfg.Separator = v
	}
	if v, ok := lookupEnv("OMNICTX_SHELL"); ok {
		cfg.Shell = v
	}
}

func applyFlags(cfg *Config, flags Flags) {
	if flags.Shell != nil {
		cfg.Shell = *flags.Shell
	}
}


func splitSegments(v string) []string {
	parts := strings.Split(v, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

// segmentAliases maps shorthand names to canonical segment identifiers. The
// cloud slot accepts the generic "cloud" plus the legacy/provider names, which
// all resolve to the single cloud segment (the active provider is chosen by the
// Cloud selection, not by the segment name).
var segmentAliases = map[string]string{
	"cloud":     SegmentCloud,
	"azure":     SegmentCloud,
	"az":        SegmentCloud,
	"aws":       SegmentCloud,
	"gcp":       SegmentCloud,
	"kube":      SegmentKube,
	"k":         SegmentKube,
	"k8s":       SegmentKube,
	"namespace": SegmentNamespace,
	"ns":        SegmentNamespace,
}

// normalizeSegments canonicalizes names and drops unknown/duplicate entries
// while preserving order.
func normalizeSegments(in []string) []string {
	seen := map[string]bool{}
	out := make([]string, 0, len(in))
	for _, s := range in {
		canon, ok := segmentAliases[strings.ToLower(strings.TrimSpace(s))]
		if !ok || seen[canon] {
			continue
		}
		seen[canon] = true
		out = append(out, canon)
	}
	return out
}

func normalizeShell(s string) string {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case ShellBash:
		return ShellBash
	case ShellZsh:
		return ShellZsh
	default:
		return ShellNone
	}
}

// normalizeCloud validates the cloud selection; anything unrecognized falls
// back to the default (auto).
func normalizeCloud(s string) string {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case SegmentAzure, "aws", "gcp", CloudNone:
		return strings.ToLower(strings.TrimSpace(s))
	default:
		return CloudAuto
	}
}
