package render

import (
	"flag"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"omnictx/internal/config"
)

var update = flag.Bool("update", false, "update golden files")

func goldenPath(name string) string {
	return filepath.Join("testdata", name+".golden")
}

// baseCfg returns default config with a fixed shell/icons for a case.
func baseCfg(shell string, icons bool) config.Config {
	c := config.Defaults()
	c.Shell = shell
	c.Icons = icons
	return c
}

func fullData() Data {
	return Data{Azure: "prod-subscription", Kube: "prod-cluster", Namespace: "payments"}
}

func TestRenderGolden(t *testing.T) {
	customSep := baseCfg(config.ShellNone, true)
	customSep.Separator = " | "

	cases := []struct {
		name string
		data Data
		cfg  config.Config
	}{
		{"full_icons_none", fullData(), baseCfg(config.ShellNone, true)},
		{"full_ascii_none", fullData(), baseCfg(config.ShellNone, false)},
		{"full_icons_bash", fullData(), baseCfg(config.ShellBash, true)},
		{"full_icons_zsh", fullData(), baseCfg(config.ShellZsh, true)},
		{"full_ascii_bash", fullData(), baseCfg(config.ShellBash, false)},
		{"no_namespace_icons_none", Data{Azure: "prod-subscription", Kube: "prod-cluster"}, baseCfg(config.ShellNone, true)},
		{"only_azure_none", Data{Azure: "prod-subscription"}, baseCfg(config.ShellNone, true)},
		{"only_kube_none", Data{Kube: "prod-cluster", Namespace: "payments"}, baseCfg(config.ShellNone, true)},
		{"namespace_default_value", Data{Kube: "prod-cluster", Namespace: "default"}, baseCfg(config.ShellNone, true)},
		{"custom_separator", fullData(), customSep},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := Render(tc.data, tc.cfg)
			p := goldenPath(tc.name)
			if *update {
				if err := os.WriteFile(p, []byte(got), 0o644); err != nil {
					t.Fatal(err)
				}
				return
			}
			want, err := os.ReadFile(p)
			if err != nil {
				t.Fatalf("read golden %s: %v (run: go test ./internal/render -update)", p, err)
			}
			if got != string(want) {
				t.Errorf("render mismatch for %s\n got: %q\nwant: %q", tc.name, got, string(want))
			}
		})
	}
}

func TestRenderEmpty(t *testing.T) {
	if got := Render(Data{}, config.Defaults()); got != "" {
		t.Fatalf("Render(empty) = %q, want empty string", got)
	}
}

func TestEscapingBash(t *testing.T) {
	out := Render(Data{Kube: "ctx"}, baseCfg(config.ShellBash, true))
	if !strings.Contains(out, "\\[") || !strings.Contains(out, "\\]") {
		t.Fatalf("bash output must wrap ANSI in \\[ \\]: %q", out)
	}
	if strings.Contains(out, "%{") {
		t.Fatalf("bash output must not contain zsh markers: %q", out)
	}
}

func TestEscapingZsh(t *testing.T) {
	out := Render(Data{Kube: "ctx"}, baseCfg(config.ShellZsh, true))
	if !strings.Contains(out, "%{") || !strings.Contains(out, "%}") {
		t.Fatalf("zsh output must wrap ANSI in %%{ %%}: %q", out)
	}
	if strings.Contains(out, "\\[") {
		t.Fatalf("zsh output must not contain bash markers: %q", out)
	}
}

func TestEscapingNoneRaw(t *testing.T) {
	out := Render(Data{Kube: "ctx"}, baseCfg(config.ShellNone, true))
	if strings.Contains(out, "\\[") || strings.Contains(out, "%{") {
		t.Fatalf("none shell must emit raw ANSI without wrappers: %q", out)
	}
	if !strings.Contains(out, "\033[") {
		t.Fatalf("none shell should still contain raw ANSI: %q", out)
	}
}

func TestNoColorWhenDisabled(t *testing.T) {
	cfg := baseCfg(config.ShellNone, true)
	cfg.Colors = map[string]string{} // no colors configured
	out := Render(Data{Kube: "ctx"}, cfg)
	if strings.Contains(out, "\033[") {
		t.Fatalf("no ANSI expected when colors are empty: %q", out)
	}
}

func BenchmarkRender(b *testing.B) {
	d := fullData()
	cfg := config.Defaults()
	cfg.Shell = config.ShellBash
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = Render(d, cfg)
	}
}
