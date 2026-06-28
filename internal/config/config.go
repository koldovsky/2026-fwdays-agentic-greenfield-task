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

// Segment identifiers in canonical form.
const (
	SegmentAzure     = "azure"
	SegmentKube      = "kube"
	SegmentNamespace = "namespace"
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
	Icons     bool
	Separator string
	Shell     string
	Colors    map[string]string
}

// Flags holds raw command-line flag values. Pointer fields are nil when the
// flag was not provided, which is what lets flags sit at the top of the
// precedence chain without clobbering lower layers.
type Flags struct {
	Segments    *string
	NoKube      bool
	NoNamespace bool
	NoAzure     bool
	Shell       *string
	Icons       *bool
	Separator   *string
	Enabled     *bool
	ConfigPath  *string
	Debug       bool
}

// LookupEnv mirrors os.LookupEnv and is injected for testability.
type LookupEnv func(string) (string, bool)

// fileConfig is the on-disk YAML model. Pointer fields distinguish "absent"
// from "zero value" so the layer only overrides what it actually specifies.
type fileConfig struct {
	Enabled   *bool             `yaml:"enabled"`
	Segments  []string          `yaml:"segments"`
	Icons     *bool             `yaml:"icons"`
	Separator *string           `yaml:"separator"`
	Colors    map[string]string `yaml:"colors"`
}

// Defaults returns the built-in configuration used when nothing overrides it.
func Defaults() Config {
	return Config{
		Enabled:   true,
		Segments:  []string{SegmentAzure, SegmentKube, SegmentNamespace},
		Icons:     true,
		Separator: " ",
		Shell:     ShellNone,
		Colors: map[string]string{
			SegmentAzure:     "blue",
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
	path := resolveConfigPath(flags, lookupEnv, home)
	if fc, note, ok := loadFile(path); ok {
		applyFile(&cfg, fc)
	} else if note != "" {
		debug = append(debug, note)
	}

	// Layer 2: environment variables.
	applyEnv(&cfg, lookupEnv, &debug)

	// Layer 3: flags (highest).
	applyFlags(&cfg, flags)

	// --no-* removes segments after order/segment resolution.
	applyDisables(&cfg, flags)

	cfg.Segments = normalizeSegments(cfg.Segments)
	cfg.Shell = normalizeShell(cfg.Shell)

	return cfg, debug
}

// resolveConfigPath applies precedence (flag > env > default) to the config path.
func resolveConfigPath(flags Flags, lookupEnv LookupEnv, home string) string {
	if flags.ConfigPath != nil && *flags.ConfigPath != "" {
		return *flags.ConfigPath
	}
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
}

func applyEnv(cfg *Config, lookupEnv LookupEnv, debug *[]string) {
	if v, ok := lookupEnv("OMNICTX_ENABLED"); ok {
		if b, err := strconv.ParseBool(strings.TrimSpace(v)); err == nil {
			cfg.Enabled = b
		} else {
			*debug = append(*debug, fmt.Sprintf("env: invalid OMNICTX_ENABLED=%q", v))
		}
	}
	if v, ok := lookupEnv("OMNICTX_SEGMENTS"); ok {
		cfg.Segments = splitSegments(v)
	}
	if v, ok := lookupEnv("OMNICTX_ICONS"); ok {
		if b, err := strconv.ParseBool(strings.TrimSpace(v)); err == nil {
			cfg.Icons = b
		} else {
			*debug = append(*debug, fmt.Sprintf("env: invalid OMNICTX_ICONS=%q", v))
		}
	}
	if v, ok := lookupEnv("OMNICTX_SEPARATOR"); ok {
		cfg.Separator = v
	}
	if v, ok := lookupEnv("OMNICTX_SHELL"); ok {
		cfg.Shell = v
	}
}

func applyFlags(cfg *Config, flags Flags) {
	if flags.Enabled != nil {
		cfg.Enabled = *flags.Enabled
	}
	if flags.Segments != nil {
		cfg.Segments = splitSegments(*flags.Segments)
	}
	if flags.Icons != nil {
		cfg.Icons = *flags.Icons
	}
	if flags.Separator != nil {
		cfg.Separator = *flags.Separator
	}
	if flags.Shell != nil {
		cfg.Shell = *flags.Shell
	}
}

// applyDisables drops segments named by --no-* flags. These take precedence
// over --segments per the spec.
func applyDisables(cfg *Config, flags Flags) {
	drop := map[string]bool{}
	if flags.NoAzure {
		drop[SegmentAzure] = true
	}
	if flags.NoKube {
		drop[SegmentKube] = true
	}
	if flags.NoNamespace {
		drop[SegmentNamespace] = true
	}
	if len(drop) == 0 {
		return
	}
	filtered := cfg.Segments[:0:0]
	for _, s := range cfg.Segments {
		if !drop[s] {
			filtered = append(filtered, s)
		}
	}
	cfg.Segments = filtered
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

// segmentAliases maps shorthand names to canonical segment identifiers.
var segmentAliases = map[string]string{
	"azure":     SegmentAzure,
	"az":        SegmentAzure,
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
