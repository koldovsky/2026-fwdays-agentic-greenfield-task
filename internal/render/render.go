// Package render turns resolved data + config into the final prompt segment
// string, handling icons, ANSI colors, and shell-specific non-printing escapes.
package render

import (
	"strings"

	"omnictx/internal/config"
)

// Data carries the resolved values for each segment. An empty field means the
// value is unavailable and the segment is skipped.
type Data struct {
	Cloud     Cloud
	Kube      string
	Namespace string
}

// Cloud is the resolved active-cloud slot. Value=="" means no cloud is shown.
// Label is the provider-chosen prefix (icon "☁ " or ASCII "az:"/"aws:"/"gcp:")
// and Key selects an optional per-provider color override.
type Cloud struct {
	Key   string
	Label string
	Value string
}

const (
	ansiReset  = "\033[0m"
	iconKube   = "⎈" // ⎈
	asciiKube  = "k8s:"
	nsSepIcon  = ":"
	nsSepASCII = "/"
)

// namedColors maps human-readable color names to ANSI SGR parameter strings.
var namedColors = map[string]string{
	"black":   "30",
	"red":     "31",
	"green":   "32",
	"yellow":  "33",
	"blue":    "34",
	"magenta": "35",
	"cyan":    "36",
	"white":   "37",
	"gray":    "90",
	"grey":    "90",
	"dim":     "2",
	"bold":    "1",
	"none":    "",
	"default": "",
}

// Render assembles the prompt segment. It returns an empty string when no
// segment produces output (the caller then prints nothing and exits 0).
func Render(d Data, cfg config.Config) string {
	pieces := make([]string, 0, len(cfg.Segments))

	for _, seg := range cfg.Segments {
		switch seg {
		case config.SegmentCloud:
			if d.Cloud.Value == "" {
				continue
			}
			pieces = append(pieces, cloudPiece(d.Cloud, cfg))
		case config.SegmentKube:
			if d.Kube == "" {
				continue
			}
			pieces = append(pieces, kubePiece(d, cfg))
		case config.SegmentNamespace:
			// Namespace is visually coupled to the kube segment (context:ns).
			// It is appended to the kube piece in kubePiece(); on its own it
			// has no standalone representation, so skip it here.
		}
	}

	return strings.Join(pieces, cfg.Separator)
}

// cloudPiece renders the active cloud slot. The label (icon or ASCII) is chosen
// by the provider; the color is colors["cloud"], overridden by a per-provider
// colors[key] when present.
func cloudPiece(c Cloud, cfg config.Config) string {
	colorKey := config.SegmentCloud
	if c.Key != "" {
		if _, ok := cfg.Colors[c.Key]; ok {
			colorKey = c.Key
		}
	}
	return colorize(cfg, colorKey, c.Label+c.Value)
}

// kubePiece renders the kube context and, when enabled and present, appends the
// namespace using the appropriate separator and its own color.
func kubePiece(d Data, cfg config.Config) string {
	prefix := iconKube + " "
	if !cfg.Icons {
		prefix = asciiKube
	}
	out := colorize(cfg, config.SegmentKube, prefix+d.Kube)

	if namespaceEnabled(cfg) && d.Namespace != "" {
		sep := nsSepIcon
		if !cfg.Icons {
			sep = nsSepASCII
		}
		out += colorize(cfg, config.SegmentNamespace, sep+d.Namespace)
	}
	return out
}

func namespaceEnabled(cfg config.Config) bool {
	for _, s := range cfg.Segments {
		if s == config.SegmentNamespace {
			return true
		}
	}
	return false
}

// colorize wraps text in the segment's ANSI color (and reset), applying the
// shell-specific non-printing escape so the shell measures prompt width
// correctly. When no color is configured, text is returned unchanged.
func colorize(cfg config.Config, segment, text string) string {
	code := resolveColor(cfg.Colors[segment])
	if code == "" {
		return text
	}
	start := "\033[" + code + "m"
	return wrap(cfg.Shell, start) + text + wrap(cfg.Shell, ansiReset)
}

// resolveColor turns a color name or raw SGR parameter list into an SGR
// parameter string. Unknown values yield "" (no color).
func resolveColor(v string) string {
	v = strings.TrimSpace(v)
	if v == "" {
		return ""
	}
	if code, ok := namedColors[strings.ToLower(v)]; ok {
		return code
	}
	if isRawSGR(v) {
		return v
	}
	return ""
}

// isRawSGR reports whether v looks like an SGR parameter list, e.g. "1;34".
func isRawSGR(v string) bool {
	for _, r := range v {
		if (r < '0' || r > '9') && r != ';' {
			return false
		}
	}
	return true
}

// wrap applies the shell-specific non-printing markers around an ANSI sequence.
//
//	bash -> \[ ... \]
//	zsh  -> %{ ... %}
//	none -> raw
func wrap(shell, ansi string) string {
	switch shell {
	case config.ShellBash:
		return "\\[" + ansi + "\\]"
	case config.ShellZsh:
		return "%{" + ansi + "%}"
	default:
		return ansi
	}
}
