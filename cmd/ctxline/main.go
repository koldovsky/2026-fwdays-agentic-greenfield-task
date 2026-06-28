// Command ctxline prints a prompt segment showing the active Azure
// subscription, the current kube-context, and its namespace.
//
// Core invariant: it NEVER breaks the prompt. Any error in normal (render) mode
// results in empty/partial output and exit 0. A top-level recover guards
// against panics.
package main

import (
	"flag"
	"fmt"
	"os"

	"ctxline/internal/azure"
	"ctxline/internal/config"
	"ctxline/internal/kube"
	"ctxline/internal/render"
	"ctxline/internal/shellinit"
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

// runInit handles `ctxline init <bash|zsh>`. This is not prompt-render mode, so
// usage errors return a non-zero code to surface mistakes during setup.
func runInit(args []string) int {
	if len(args) < 1 {
		fmt.Fprintln(os.Stderr, "usage: ctxline init <bash|zsh>")
		return 2
	}
	cmd := selfCommand()
	code, err := shellinit.Generate(args[0], cmd)
	if err != nil {
		fmt.Fprintln(os.Stderr, "ctxline:", err)
		return 2
	}
	fmt.Print(code)
	return 0
}

// selfCommand returns the command used inside the generated shell snippet.
// We use the bare binary name so the snippet relies on PATH (the documented
// install path), matching starship/zoxide/direnv conventions.
func selfCommand() string {
	return "ctxline"
}

func runRender(args []string) {
	flags, showVersion, ok := parseRenderArgs(args)
	if !ok {
		// Never break the prompt over a bad flag.
		return
	}

	if showVersion {
		fmt.Printf("ctxline %s\n", Version)
		return
	}

	home, _ := os.UserHomeDir()
	cfg, diags := config.Resolve(flags, os.LookupEnv, home)

	if flags.Debug {
		for _, d := range diags {
			fmt.Fprintln(os.Stderr, "ctxline:", d)
		}
	}

	if !cfg.Enabled {
		// ctxoff path: print nothing, exit 0.
		return
	}

	data := gather(cfg, home)
	out := render.Render(data, cfg)
	fmt.Print(out)
}

// parseRenderArgs parses CLI args into precedence-aware config.Flags. ok=false
// signals a parse error (the caller then exits silently to protect the prompt).
// It is kept separate from runRender so the flag-merge logic is unit-testable.
func parseRenderArgs(args []string) (flags config.Flags, showVersion bool, ok bool) {
	fs := flag.NewFlagSet("ctxline", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)

	segments := fs.String("segments", "", "comma-separated segments and order (azure,kube,namespace)")
	noKube := fs.Bool("no-kube", false, "disable the kube-context segment")
	noNamespace := fs.Bool("no-namespace", false, "disable the namespace segment")
	noAzure := fs.Bool("no-azure", false, "disable the Azure subscription segment")
	shell := fs.String("shell", "", "color escaping mode: bash|zsh|none")
	icons := fs.Bool("icons", false, "use icons (default)")
	noIcons := fs.Bool("no-icons", false, "use ASCII labels instead of icons")
	separator := fs.String("separator", "", "separator between segment groups")
	enabled := fs.Bool("enabled", false, "master enable")
	disabled := fs.Bool("disabled", false, "master disable")
	configPath := fs.String("config", "", "path to config file")
	debug := fs.Bool("debug", false, "print diagnostics to stderr")
	version := fs.Bool("version", false, "print version and exit")

	if err := fs.Parse(args); err != nil {
		return config.Flags{}, false, false
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
		}
	})
	// --no-icons wins over --icons when both are present; likewise --disabled
	// wins over --enabled. Bool flags default to false, so a true value here
	// means the flag was explicitly passed.
	if *noIcons {
		b := false
		flags.Icons = &b
	} else if *icons {
		b := true
		flags.Icons = &b
	}
	if *disabled {
		b := false
		flags.Enabled = &b
	} else if *enabled {
		b := true
		flags.Enabled = &b
	}

	return flags, *version, true
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
