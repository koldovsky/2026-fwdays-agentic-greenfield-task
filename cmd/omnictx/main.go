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
	"text/tabwriter"

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
		case "kube":
			os.Exit(runKube(args[1:], os.Stdout, os.Stderr))
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
  cloud [azure|aws|gcp|auto|none|on|off]
                    persist the active cloud to config file; off hides the slot,
                    on returns to auto-detect; without an argument prints the
                    effective value (OMNICTX_CLOUD overrides per-session)
  cloud [azure|aws|gcp] list
                    offline table of that provider's local accounts (AWS profiles,
                    gcloud configurations, Azure subscriptions); bare "cloud list"
                    uses the active provider
  cloud <azure|gcp> use <account>
                    switch the active account: azure flips isDefault in
                    azureProfile.json (name or id), gcp activates the named
                    configuration; accepts short aliases from the config file
                    and pins that provider as the displayed cloud on success.
                    AWS has no persistent profile — use export AWS_PROFILE=<name>
  kube [<context>|list|on|off]
                    switch the current kube-context (rewrites current-context in
                    kubeconfig); no argument prints the current one, "list" shows
                    all available contexts; on/off toggle the kube segment in the
                    config file and never touch kubeconfig (OMNICTX_KUBE overrides
                    per-session)

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
		// Column-0 prefix only: an indented "key:" belongs to a nested block
		// (e.g. colors.kube), and replacing it would corrupt the YAML.
		if strings.HasPrefix(l, prefix) {
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

const cloudUsage = "usage: omnictx cloud [azure|aws|gcp|auto|none|on|off]\n" +
	"       omnictx cloud [azure|aws|gcp] list\n" +
	"       omnictx cloud <azure|gcp> use <account>"

// runCloud handles `omnictx cloud [value]` and the read-only listing forms.
// With no argument it prints the effective selection (env > config > default).
// `list` (reserved, never persisted) prints the active provider's accounts;
// `<provider> list` prints that provider's accounts. With one value argument
// it persists the value to the config file, like `on`/`off` do for enabled.
// This is interactive setup mode, so unlike render's normalizeCloud (which
// silently falls back to auto to protect the prompt) an unknown value is
// rejected loudly.
func runCloud(args []string, stdout, stderr io.Writer) int {
	home, _ := os.UserHomeDir()

	if len(args) == 0 {
		cfg, notes := config.Resolve(config.Flags{}, os.LookupEnv, home)
		warnAll(stderr, notes)
		_, _ = fmt.Fprintln(stdout, cfg.Cloud)
		return 0
	}
	if len(args) > 3 {
		_, _ = fmt.Fprintln(stderr, cloudUsage)
		return 2
	}

	if len(args) == 3 {
		return runCloudUse(args, home, stdout, stderr)
	}

	if len(args) == 2 {
		provider := strings.ToLower(strings.TrimSpace(args[0]))
		form := strings.ToLower(strings.TrimSpace(args[1]))
		switch {
		case form != "list":
			_, _ = fmt.Fprintln(stderr, cloudUsage)
			return 2
		case provider == "azure" || provider == "aws" || provider == "gcp":
			if provider == "azure" {
				warnAll(stderr, azure.Check(os.LookupEnv, home))
			}
			printCloudList(stdout, provider, home)
			return 0
		default:
			_, _ = fmt.Fprintln(stderr, cloudUsage)
			return 2
		}
	}

	if strings.ToLower(strings.TrimSpace(args[0])) == "list" {
		// Bare `cloud list`: the effective provider, selected exactly like
		// render does; none selected -> quiet, exit 0.
		cfg, notes := config.Resolve(config.Flags{}, os.LookupEnv, home)
		warnAll(stderr, notes)
		if active, ok := cloud.Select(cloudProviders(), cfg.Cloud, os.LookupEnv, home); ok {
			if active.Key() == "azure" {
				warnAll(stderr, azure.Check(os.LookupEnv, home))
			}
			printCloudList(stdout, active.Key(), home)
		}
		return 0
	}

	v := strings.ToLower(strings.TrimSpace(args[0]))
	// on/off are display-toggle aliases: off hides the slot, on returns to
	// auto-detect (a previous provider pin is not remembered).
	switch v {
	case "on":
		v = config.CloudAuto
	case "off":
		v = config.CloudNone
	}
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

const kubeUsage = "usage: omnictx kube [<context>|list|on|off]"

// runKube handles `omnictx kube [<context>|list|on|off]`. No argument prints
// the current context; the reserved words (contexts with those literal names
// are not switchable here) come first: `list` prints all contexts with the
// current one marked, `on`/`off` persist the kube display toggle to omnictx's
// own config and never touch a kubeconfig. Any other argument validates
// against the parsed kubeconfigs and then rewrites current-context via
// kube.WriteContext. That switch is the only code path in omnictx that writes
// to a file it does not own — render mode never does.
func runKube(args []string, stdout, stderr io.Writer) int {
	home, _ := os.UserHomeDir()

	if len(args) == 0 {
		if ctx := kube.Read(os.LookupEnv, home).Context; ctx != "" {
			_, _ = fmt.Fprintln(stdout, ctx)
		}
		return 0
	}
	if len(args) > 1 {
		_, _ = fmt.Fprintln(stderr, kubeUsage)
		return 2
	}

	switch args[0] {
	case "on", "off":
		val := "true"
		if args[0] == "off" {
			val = "false"
		}
		if err := setConfigKey(globalConfigPath(), "kube", val); err != nil {
			_, _ = fmt.Fprintf(stderr, "omnictx: %v\n", err)
			return 1
		}
		return 0
	}

	if args[0] == "list" {
		warnAll(stderr, kube.Check(os.LookupEnv, home))
		printKubeTable(stdout, kube.Contexts(os.LookupEnv, home), kube.Read(os.LookupEnv, home).Context)
		return 0
	}

	target := args[0]
	entries := kube.Contexts(os.LookupEnv, home)
	names := make([]string, len(entries))
	found := false
	for i, e := range entries {
		names[i] = e.Name
		if e.Name == target {
			found = true
		}
	}
	if !found {
		available := "(none found)"
		if len(names) > 0 {
			available = strings.Join(names, ", ")
		}
		_, _ = fmt.Fprintf(stderr, "omnictx: unknown context %q\navailable contexts: %s\n%s\n", target, available, kubeUsage)
		return 2
	}

	if err := kube.WriteContext(os.LookupEnv, home, target); err != nil {
		_, _ = fmt.Fprintf(stderr, "omnictx: %v\n", err)
		return 1
	}
	return 0
}

// runCloudUse handles `omnictx cloud <provider> use <account>`: switching the
// provider's active account where that state lives in a local file (gcloud
// active_config, azureProfile.json isDefault). AWS is the honest exception —
// it has no persistent current-profile concept, so we print the session env
// hint instead of inventing one. The account argument goes through the
// `aliases` config key first; names/ids are otherwise matched verbatim.
func runCloudUse(args []string, home string, _, stderr io.Writer) int {
	provider := strings.ToLower(strings.TrimSpace(args[0]))
	verb := strings.ToLower(strings.TrimSpace(args[1]))
	account := strings.TrimSpace(args[2])

	if verb != "use" {
		_, _ = fmt.Fprintln(stderr, cloudUsage)
		return 2
	}

	cfg, notes := config.Resolve(config.Flags{}, os.LookupEnv, home)
	warnAll(stderr, notes)
	if canon := cfg.Aliases[provider][account]; canon != "" {
		account = canon
	}

	switch provider {
	case "gcp":
		if err := gcp.Use(os.LookupEnv, home, account); err != nil {
			code := 1
			var unknown *gcp.UnknownConfigError
			if errors.As(err, &unknown) {
				code = 2
			}
			_, _ = fmt.Fprintf(stderr, "omnictx: %v\n", err)
			return code
		}
		return pinCloudAfterUse(provider, stderr)
	case "azure":
		if err := azure.Use(os.LookupEnv, home, account); err != nil {
			code := 1
			var unknown *azure.UnknownAccountError
			var ambiguous *azure.AmbiguousAccountError
			if errors.As(err, &unknown) || errors.As(err, &ambiguous) {
				code = 2
			}
			_, _ = fmt.Fprintf(stderr, "omnictx: %v\n", err)
			return code
		}
		return pinCloudAfterUse(provider, stderr)
	case "aws":
		_, _ = fmt.Fprintf(stderr,
			"omnictx: AWS has no persistent current profile; set it for the session instead:\n  export AWS_PROFILE=%s\n", account)
		return 2
	default:
		_, _ = fmt.Fprintln(stderr, cloudUsage)
		return 2
	}
}

// warnAll prints interactive-mode warnings to stderr. Render never calls it:
// the prompt stays silent about broken sources by design, but a human typing
// a subcommand deserves to know why their config is being ignored.
func warnAll(stderr io.Writer, notes []string) {
	for _, n := range notes {
		_, _ = fmt.Fprintf(stderr, "omnictx: warning: %s\n", n)
	}
}

// pinCloudAfterUse persists `cloud: <provider>` after a successful account
// switch, so the prompt immediately shows the provider that was just switched
// to (instead of whatever the previous pin/auto-detection displayed).
func pinCloudAfterUse(provider string, stderr io.Writer) int {
	if err := setConfigKey(globalConfigPath(), "cloud", provider); err != nil {
		_, _ = fmt.Fprintf(stderr, "omnictx: account switched, but pinning the cloud failed: %v\n", err)
		return 1
	}
	return 0
}

// printTable renders a kubectl-style table with tabwriter alignment. The
// header appears only when there is at least one row, so empty listings stay
// quiet (no output, exit 0).
func printTable(stdout io.Writer, header []string, rows [][]string) {
	if len(rows) == 0 {
		return
	}
	w := tabwriter.NewWriter(stdout, 0, 0, 3, ' ', 0)
	_, _ = fmt.Fprintln(w, strings.Join(header, "\t"))
	for _, r := range rows {
		_, _ = fmt.Fprintln(w, strings.Join(r, "\t"))
	}
	_ = w.Flush()
}

// printKubeTable renders `kube list` as a kubectl-get-contexts-style table.
func printKubeTable(stdout io.Writer, entries []kube.ContextEntry, current string) {
	rows := make([][]string, 0, len(entries))
	for _, e := range entries {
		marker := ""
		if e.Name == current {
			marker = "*"
		}
		rows = append(rows, []string{marker, e.Name, e.Cluster, e.AuthInfo, e.Namespace})
	}
	printTable(stdout, []string{"CURRENT", "NAME", "CLUSTER", "AUTHINFO", "NAMESPACE"}, rows)
}

// printCloudList renders `cloud <provider> list`: the provider's locally
// configured accounts, read from the same offline sources as render.
func printCloudList(stdout io.Writer, key, home string) {
	switch key {
	case "aws":
		current := aws.CurrentProfile(os.LookupEnv)
		var rows [][]string
		for _, p := range aws.Profiles(os.LookupEnv, home) {
			marker := ""
			if p.Name == current {
				marker = "*"
			}
			rows = append(rows, []string{marker, p.Name, p.Region})
		}
		printTable(stdout, []string{"CURRENT", "NAME", "REGION"}, rows)
	case "gcp":
		current := gcp.CurrentConfiguration(os.LookupEnv, home)
		var rows [][]string
		for _, c := range gcp.Configurations(os.LookupEnv, home) {
			marker := ""
			if c.Name == current {
				marker = "*"
			}
			rows = append(rows, []string{marker, c.Name, c.Account, c.Project})
		}
		printTable(stdout, []string{"CURRENT", "NAME", "ACCOUNT", "PROJECT"}, rows)
	case "azure":
		var rows [][]string
		for _, s := range azure.Subscriptions(os.LookupEnv, home) {
			marker := ""
			if s.IsDefault {
				marker = "*"
			}
			rows = append(rows, []string{marker, s.Name, s.ID, s.State})
		}
		printTable(stdout, []string{"CURRENT", "NAME", "ID", "STATE"}, rows)
	}
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
			// The kube display toggle (config `kube:` / OMNICTX_KUBE) gates the
			// segment on top of the segments list; namespace follows kube.
			needKube = cfg.Kube
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
