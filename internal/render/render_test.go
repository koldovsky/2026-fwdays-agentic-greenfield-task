package render

import (
	"flag"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"omnictx/internal/cloud"
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

// azureCloud builds the Azure cloud slot for the given icon mode, matching what
// the azure provider's Label would produce.
func azureCloud(icons bool) Cloud {
	label := cloud.IconAzure
	if !icons {
		label = "az:"
	}
	return Cloud{Key: "azure", Label: label, Value: "prod-subscription"}
}

func fullData(icons bool) Data {
	return Data{Cloud: azureCloud(icons), Kube: "prod-cluster", Namespace: "payments"}
}

func TestRenderGolden(t *testing.T) {
	customSep := baseCfg(config.ShellNone, true)
	customSep.Separator = " | "

	cases := []struct {
		name string
		data Data
		cfg  config.Config
	}{
		{"full_icons_none", fullData(true), baseCfg(config.ShellNone, true)},
		{"full_ascii_none", fullData(false), baseCfg(config.ShellNone, false)},
		{"full_icons_bash", fullData(true), baseCfg(config.ShellBash, true)},
		{"full_icons_zsh", fullData(true), baseCfg(config.ShellZsh, true)},
		{"full_ascii_bash", fullData(false), baseCfg(config.ShellBash, false)},
		{"no_namespace_icons_none", Data{Cloud: azureCloud(true), Kube: "prod-cluster"}, baseCfg(config.ShellNone, true)},
		{"only_azure_none", Data{Cloud: azureCloud(true)}, baseCfg(config.ShellNone, true)},
		{"only_kube_none", Data{Kube: "prod-cluster", Namespace: "payments"}, baseCfg(config.ShellNone, true)},
		{"namespace_default_value", Data{Kube: "prod-cluster", Namespace: "default"}, baseCfg(config.ShellNone, true)},
		{"custom_separator", fullData(true), customSep},
		{"aws_icons_none", Data{Cloud: Cloud{Key: "aws", Label: cloud.IconAWS, Value: "prod/eu-west-1"}, Kube: "eks-prod"}, baseCfg(config.ShellNone, true)},
		{"aws_ascii_none", Data{Cloud: Cloud{Key: "aws", Label: "aws:", Value: "prod/eu-west-1"}, Kube: "eks-prod"}, baseCfg(config.ShellNone, false)},
		{"gcp_icons_zsh", Data{Cloud: Cloud{Key: "gcp", Label: cloud.IconGCP, Value: "my-project"}, Kube: "gke-prod"}, baseCfg(config.ShellZsh, true)},
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

// TestCloudPerProviderColor verifies the cloud slot uses colors["cloud"] by
// default and an optional per-provider colors[key] override when present.
func TestCloudPerProviderColor(t *testing.T) {
	c := Cloud{Key: "aws", Label: "aws:", Value: "prod"}

	// No per-provider key -> falls back to the generic "cloud" color (blue=34).
	cfg := baseCfg(config.ShellNone, false)
	if out := Render(Data{Cloud: c}, cfg); !strings.Contains(out, "\033[34m") {
		t.Errorf("expected generic cloud color (34): %q", out)
	}

	// Per-provider override wins.
	cfg.Colors["aws"] = "red" // 31
	if out := Render(Data{Cloud: c}, cfg); !strings.Contains(out, "\033[31m") {
		t.Errorf("expected per-provider aws color (31): %q", out)
	}
}

func BenchmarkRender(b *testing.B) {
	d := fullData(true)
	cfg := config.Defaults()
	cfg.Shell = config.ShellBash
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = Render(d, cfg)
	}
}
