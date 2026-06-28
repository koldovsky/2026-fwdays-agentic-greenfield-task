// Command omnictx prints a prompt segment showing the active Azure
// subscription, the current kube-context, and its namespace.
//
// Core invariant: it NEVER breaks the prompt. Any error in normal (render) mode
// results in empty/partial output and exit 0. A top-level recover guards
// against panics.
package main

import (
	"errors"
	"flag"
	"fmt"
	"io"
	"os"

	"omnictx/internal/azure"
	"omnictx/internal/config"
	"omnictx/internal/kube"
	"omnictx/internal/render"
	"omnictx/internal/shellinit"
)

// Version is overridable at build time via -ldflags "-X main.Version=...".
var Version = "dev"

func main() {
	// The render path must never break the prompt: swallow any panic and exit 0.
	defer func() {
		if r := recover(); r != nil {
			os.Exit(0)
		}
	}()

	args := os.Args[1:]
	if len(args) > 0 && args[0] == "init" {
		os.Exit(runInit(args[1:]))
	}

	runRender(args)
	os.Exit(0)
}

// runInit handles `omnictx init <bash|zsh>`. This is not prompt-render mode, so
// usage errors return a non-zero code to surface mistakes during setup.
func runInit(args []string) int {
	if len(args) < 1 {
		fmt.Fprintln(os.Stderr, "usage: omnictx init <bash|zsh>")
		return 2
	}
	cmd := selfCommand()
	code, err := shellinit.Generate(args[0], cmd)
	if err != nil {
		fmt.Fprintln(os.Stderr, "omnictx:", err)
		return 2
	}
	fmt.Print(code)
	return 0
}

// selfCommand returns the command used inside the generated shell snippet.
// We use the bare binary name so the snippet relies on PATH (the documented
// install path), matching starship/zoxide/direnv conventions.
func selfCommand() string {
	return "omnictx"
}

func runRender(args []string) {
	flags, showVersion, showHelp, ok := parseRenderArgs(args)
	if !ok {
		// Never break the prompt over a bad flag.
		return
	}

	if showHelp {
		printUsage(os.Stdout)
		return
	}

	if showVersion {
		fmt.Printf("omnictx %s\n", Version)
		return
	}

	home, _ := os.UserHomeDir()
	cfg, diags := config.Resolve(flags, os.LookupEnv, home)

	if flags.Debug {
		for _, d := range diags {
			fmt.Fprintln(os.Stderr, "omnictx:", d)
		}
	}

	if !cfg.Enabled {
		// omnioff path: print nothing, exit 0.
		return
	}

	data := gather(cfg, home)
	out := render.Render(data, cfg)
	fmt.Print(out)
}

// printUsage writes the grouped, human-readable help. It deliberately replaces
// flag.PrintDefaults(): flags are shown with their allowed values and matching
// env var, with double-dash display to match the README (parsing still accepts
// single dash).
func printUsage(w io.Writer) {
	// Ignore the write error: help goes to stdout/a test buffer; nothing to recover.
	_, _ = fmt.Fprintln(w, `omnictx — print a shell-prompt segment with your active Azure
subscription, current kube-context, and namespace.

Usage:
  omnictx [flags]                 print the segment (used by the prompt hook)
  omnictx init <bash|zsh>         print shell integration code
  eval "$(omnictx init bash)"     typical install (add to ~/.bashrc)

Subcommands:
  init <bash|zsh>   shell integration; defines omnion / omnioff / omnitoggle
  --version         print version and exit

Flags:
  --shell <bash|zsh|none>     color escaping for the prompt (env: OMNICTX_SHELL)
  --segments <list>           ordered segments, comma-separated:
                              azure,kube,namespace (env: OMNICTX_SEGMENTS)
  --separator <str>           separator between segments (env: OMNICTX_SEPARATOR)
  --icons / --no-icons        icons (default) vs ASCII labels (env: OMNICTX_ICONS)
  --no-azure / --no-kube / --no-namespace
                              drop one segment; wins over --segments
  --enabled[=<bool>]          master on/off; normally driven by OMNICTX_ENABLED
                              via omnion/omnioff, so rarely passed directly
                              (env: OMNICTX_ENABLED)
  --config <path>             config file path
                              (env: OMNICTX_CONFIG; default ~/.config/omnictx/config.yaml)
  --debug                     print diagnostics to stderr
  --version                   print version and exit
  -h, --help                  print this help and exit

Flags accept single or double dash. In render mode any flag error prints
nothing and exits 0 — omnictx never breaks the prompt.`)
}

// parseRenderArgs parses CLI args into precedence-aware config.Flags. ok=false
// signals a parse error (the caller then exits silently to protect the prompt).
// showHelp is true when -h/--help was requested. It is kept separate from
// runRender so the flag-merge logic is unit-testable.
func parseRenderArgs(args []string) (flags config.Flags, showVersion, showHelp, ok bool) {
	fs := flag.NewFlagSet("omnictx", flag.ContinueOnError)
	// We own all output: suppress flag's built-in error/usage dump so a bad flag
	// in render mode stays silent and help is printed explicitly by the caller.
	fs.SetOutput(io.Discard)
	fs.Usage = func() {}

	segments := fs.String("segments", "", "comma-separated segments and order (azure,kube,namespace)")
	noKube := fs.Bool("no-kube", false, "disable the kube-context segment")
	noNamespace := fs.Bool("no-namespace", false, "disable the namespace segment")
	noAzure := fs.Bool("no-azure", false, "disable the Azure subscription segment")
	shell := fs.String("shell", "", "color escaping mode: bash|zsh|none")
	icons := fs.Bool("icons", false, "use icons (default)")
	noIcons := fs.Bool("no-icons", false, "use ASCII labels instead of icons")
	separator := fs.String("separator", "", "separator between segment groups")
	enabled := fs.Bool("enabled", true, "master enable (--enabled=false to disable)")
	configPath := fs.String("config", "", "path to config file")
	debug := fs.Bool("debug", false, "print diagnostics to stderr")
	version := fs.Bool("version", false, "print version and exit")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return config.Flags{}, false, true, true
		}
		return config.Flags{}, false, false, false
	}

	flags = config.Flags{
		NoKube:      *noKube,
		NoNamespace: *noNamespace,
		NoAzure:     *noAzure,
		Debug:       *debug,
	}
	// Only attach values for flags the user actually set, so they sit at the
	// top of the precedence chain without clobbering lower layers.
	fs.Visit(func(f *flag.Flag) {
		switch f.Name {
		case "segments":
			flags.Segments = segments
		case "shell":
			flags.Shell = shell
		case "separator":
			flags.Separator = separator
		case "config":
			flags.ConfigPath = configPath
		case "enabled":
			// Single master flag (--enabled / --enabled=false); only honored when
			// explicitly passed so the env var still drives omnion/omnioff.
			b := *enabled
			flags.Enabled = &b
		}
	})
	// --no-icons wins over --icons when both are present. Bool flags default to
	// false, so a true value here means the flag was explicitly passed.
	if *noIcons {
		b := false
		flags.Icons = &b
	} else if *icons {
		b := true
		flags.Icons = &b
	}

	return flags, *version, false, true
}

// gather reads only the data sources required by the enabled segments.
func gather(cfg config.Config, home string) render.Data {
	needKube := false
	needAzure := false
	for _, s := range cfg.Segments {
		switch s {
		case config.SegmentKube:
			needKube = true
		case config.SegmentAzure:
			needAzure = true
		}
	}

	var data render.Data
	if needAzure {
		data.Azure = azure.Read(os.LookupEnv, home)
	}
	// The namespace renders only as a suffix of the kube segment, so reading
	// the kubeconfig is only worthwhile when kube itself is enabled.
	if needKube {
		info := kube.Read(os.LookupEnv, home)
		data.Kube = info.Context
		data.Namespace = info.Namespace
	}
	return data
}
