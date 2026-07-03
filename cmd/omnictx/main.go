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
		case "on", "enable":
			os.Exit(runEnable(true))
		case "off", "disable":
			os.Exit(runEnable(false))
		case "toggle":
			os.Exit(runToggle())
		case "cloud":
			os.Exit(runCloud(args[1:], os.Stdout, os.Stderr))
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
	shell := args[0]
	cmd := selfCommand()
	code, err := shellinit.Generate(shell, cmd)
	if err != nil {
		fmt.Fprintln(os.Stderr, "omnictx:", err)
		return 2
	}
	if isTTY(os.Stdout) {
		fmt.Fprintf(os.Stderr, "Hint: add this line to ~/.%src:\n  eval \"$(%s init %s)\"\n", shell, cmd, shell)
		return 0
	}
	fmt.Print(code)
	return 0
}

func isTTY(f *os.File) bool {
	fi, err := f.Stat()
	return err == nil && (fi.Mode()&os.ModeCharDevice) != 0
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
	cfg, _ := config.Resolve(flags, os.LookupEnv, home)

	if !cfg.Enabled {
		// omnioff path: print nothing, exit 0.
		return
	}

	data := gather(cfg, home)
	out := render.Render(data, cfg)
	fmt.Print(out)
}

// printUsage writes the grouped, human-readable help.
func printUsage(w io.Writer) {
	_, _ = fmt.Fprintln(w, `omnictx — print a shell-prompt segment with your active cloud
provider (Azure/AWS/GCP), current kube-context, and namespace.

Usage:
  omnictx [--shell <bash|zsh|none>]   print the segment (used by the prompt hook)
  omnictx init <bash|zsh>             print shell integration code
  eval "$(omnictx init bash)"         typical install (add to ~/.bashrc)

Subcommands:
  init <bash|zsh>   shell integration (add to ~/.bashrc / ~/.zshrc)
  on / off          persist enabled: true/false to config file (affects all future shells)
  cloud [azure|aws|gcp|auto|none]
                    persist the active cloud to config file; without an argument
                    prints the effective value (OMNICTX_CLOUD overrides per-session)

Flags:
  --version                   print version and exit
  -h, --help                  print this help and exit`)
}

// parseRenderArgs parses CLI args into config.Flags. ok=false signals a parse
// error (the caller then exits silently to protect the prompt).
func parseRenderArgs(args []string) (flags config.Flags, showVersion, showHelp, ok bool) {
	fs := flag.NewFlagSet("omnictx", flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	fs.Usage = func() {}

	shell := fs.String("shell", "", "color escaping mode: bash|zsh|none")
	version := fs.Bool("version", false, "print version and exit")

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return config.Flags{}, false, true, true
		}
		return config.Flags{}, false, false, false
	}

	fs.Visit(func(f *flag.Flag) {
		if f.Name == "shell" {
			flags.Shell = shell
		}
	})

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

const cloudUsage = "usage: omnictx cloud [azure|aws|gcp|auto|none]"

// runCloud handles `omnictx cloud [value]`. With no argument it prints the
// effective selection (env > config > default). With one argument it persists
// the value to the config file, like `on`/`off` do for enabled. This is
// interactive setup mode, so unlike render's normalizeCloud (which silently
// falls back to auto to protect the prompt) an unknown value is rejected loudly.
func runCloud(args []string, stdout, stderr io.Writer) int {
	home, _ := os.UserHomeDir()

	if len(args) == 0 {
		cfg, _ := config.Resolve(config.Flags{}, os.LookupEnv, home)
		_, _ = fmt.Fprintln(stdout, cfg.Cloud)
		return 0
	}
	if len(args) > 1 {
		_, _ = fmt.Fprintln(stderr, cloudUsage)
		return 2
	}

	v := strings.ToLower(strings.TrimSpace(args[0]))
	switch v {
	case "azure", "aws", "gcp", config.CloudAuto, config.CloudNone:
	default:
		_, _ = fmt.Fprintf(stderr, "omnictx: invalid cloud %q\n%s\n", args[0], cloudUsage)
		return 2
	}

	if err := setConfigKey(globalConfigPath(), "cloud", v); err != nil {
		_, _ = fmt.Fprintf(stderr, "omnictx: %v\n", err)
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
