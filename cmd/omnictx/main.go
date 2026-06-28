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
	"path/filepath"
	"strings"

	"omnictx/internal/aws"
	"omnictx/internal/azure"
	"omnictx/internal/cloud"
	"omnictx/internal/config"
	"omnictx/internal/gcp"
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
	if len(args) > 0 {
		switch args[0] {
		case "init":
			os.Exit(runInit(args[1:]))
		case "enable":
			os.Exit(runEnable(true))
		case "disable":
			os.Exit(runEnable(false))
		case "toggle":
			os.Exit(runToggle())
		}
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
                    pass -G to omnion/omnioff/omnitoggle to persist to config
  enable / disable  write enabled: true/false to config (all future shells)
  toggle            flip the persisted enabled state in config
  --version         print version and exit

Flags:
  --cloud <azure|aws|gcp|auto|none>
                              active cloud; auto = first present (azure→aws→gcp)
                              one-shot flag — session: OMNICTX_CLOUD=aws;
                              permanent: cloud: aws in config (env: OMNICTX_CLOUD)
  --shell <bash|zsh|none>     color escaping for the prompt (env: OMNICTX_SHELL)
  --segments <list>           ordered segments, comma-separated:
                              cloud,kube,namespace (env: OMNICTX_SEGMENTS)
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

	segments := fs.String("segments", "", "comma-separated segments and order (cloud,kube,namespace)")
	cloudSel := fs.String("cloud", "", "active cloud: azure|aws|gcp|auto|none")
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
		case "cloud":
			flags.Cloud = cloudSel
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

// globalConfigPath returns the path to the config file honoring OMNICTX_CONFIG.
func globalConfigPath() string {
	if p := os.Getenv("OMNICTX_CONFIG"); p != "" {
		return p
	}
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".config", "omnictx", "config.yaml")
}

// setConfigKey updates (or creates) the config file, changing only the line
// for the given key and preserving all other content including comments.
func setConfigKey(path, key, value string) error {
	newLine := key + ": " + value

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
				return err
			}
			return os.WriteFile(path, []byte(newLine+"\n"), 0o644)
		}
		return err
	}

	prefix := key + ":"
	lines := strings.Split(string(data), "\n")
	replaced := false
	for i, l := range lines {
		if strings.HasPrefix(strings.TrimSpace(l), prefix) {
			lines[i] = newLine
			replaced = true
			break
		}
	}
	if !replaced {
		lines = append([]string{newLine}, lines...)
	}
	return os.WriteFile(path, []byte(strings.Join(lines, "\n")), 0o644)
}

func setGlobalEnabled(path string, enabled bool) error {
	val := "true"
	if !enabled {
		val = "false"
	}
	return setConfigKey(path, "enabled", val)
}

// runEnable handles `omnictx enable` and `omnictx disable`.
func runEnable(enabled bool) int {
	if err := setGlobalEnabled(globalConfigPath(), enabled); err != nil {
		fmt.Fprintf(os.Stderr, "omnictx: %v\n", err)
		return 1
	}
	return 0
}

// runToggle handles `omnictx toggle`: reads the persisted state and flips it.
func runToggle() int {
	path := globalConfigPath()
	enabled := true
	if data, err := os.ReadFile(path); err == nil {
		for _, l := range strings.Split(string(data), "\n") {
			t := strings.TrimSpace(l)
			if strings.HasPrefix(t, "enabled:") {
				enabled = strings.TrimSpace(strings.TrimPrefix(t, "enabled:")) != "false"
				break
			}
		}
	}
	if err := setGlobalEnabled(path, !enabled); err != nil {
		fmt.Fprintf(os.Stderr, "omnictx: %v\n", err)
		return 1
	}
	return 0
}

// cloudProviders is the priority-ordered provider list used for `auto` detection
// (azure → aws → gcp).
func cloudProviders() []cloud.Provider {
	return []cloud.Provider{azure.New(), aws.New(), gcp.New()}
}

// gather reads only the data sources required by the enabled segments.
func gather(cfg config.Config, home string) render.Data {
	needKube := false
	needCloud := false
	for _, s := range cfg.Segments {
		switch s {
		case config.SegmentKube:
			needKube = true
		case config.SegmentCloud:
			needCloud = true
		}
	}

	var data render.Data
	if needCloud {
		if active, ok := cloud.Select(cloudProviders(), cfg.Cloud, os.LookupEnv, home); ok {
			if r := active.Read(os.LookupEnv, home); r.OK {
				data.Cloud = render.Cloud{
					Key:   active.Key(),
					Label: active.Label(cfg.Icons),
					Value: r.Text,
				}
			}
		}
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
