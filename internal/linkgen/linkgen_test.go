package linkgen

import (
	"net/url"
	"strings"
	"testing"

	"md/agentic/monojar/internal/jarmatching"
)

func TestGenerateLinks_ExactURL(t *testing.T) {
	tests := []struct {
		name   string
		sendID string
		amount int
		want   string
	}{
		{name: "typical", sendID: "4xR2yTk", amount: 5000, want: "https://send.monobank.ua/jar/4xR2yTk?a=5000"},
		{name: "small amount", sendID: "8kP", amount: 1, want: "https://send.monobank.ua/jar/8kP?a=1"},
		{name: "large amount", sendID: "2wQ", amount: 1499900, want: "https://send.monobank.ua/jar/2wQ?a=1499900"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			matched := []jarmatching.Matched{{Name: "Заощадження", Amount: tt.amount, SendID: tt.sendID}}
			links := GenerateLinks(matched)
			if len(links) != 1 || links[0].URL != tt.want {
				t.Errorf("URL = %q, want %q", links[0].URL, tt.want)
			}
		})
	}
}

func TestGenerateLinks_AmountIsNotScaled(t *testing.T) {
	matched := []jarmatching.Matched{{Name: "Подорожі", Amount: 3000, SendID: "sid"}}
	links := GenerateLinks(matched)

	parsed, err := url.Parse(links[0].URL)
	if err != nil {
		t.Fatalf("url.Parse(%q) failed: %v", links[0].URL, err)
	}
	if got := parsed.Query().Get("a"); got != "3000" {
		t.Errorf("a = %q, want %q (unscaled)", got, "3000")
	}
}

func TestGenerateLinks_NoExtraQueryParamsOrTokenLeakage(t *testing.T) {
	const secretToken = "super-secret-mono-token"
	matched := []jarmatching.Matched{{Name: "Подушка", Amount: 1500, SendID: "sid-cushion"}}
	links := GenerateLinks(matched)

	parsed, err := url.Parse(links[0].URL)
	if err != nil {
		t.Fatalf("url.Parse(%q) failed: %v", links[0].URL, err)
	}
	if len(parsed.Query()) != 1 {
		t.Errorf("query params = %v, want exactly one (\"a\")", parsed.Query())
	}
	if strings.Contains(links[0].URL, secretToken) {
		t.Errorf("URL %q unexpectedly contains the token", links[0].URL)
	}
}

func TestGenerateLinks_PreservesOrder(t *testing.T) {
	matched := []jarmatching.Matched{
		{Name: "Подорожі", Amount: 3000, SendID: "sid-trip"},
		{Name: "Заощадження", Amount: 5000, SendID: "sid-save"},
		{Name: "Подушка", Amount: 1500, SendID: "sid-cushion"},
	}

	links := GenerateLinks(matched)

	if len(links) != len(matched) {
		t.Fatalf("len(links) = %d, want %d", len(links), len(matched))
	}
	for i, m := range matched {
		if links[i].Name != m.Name || links[i].Amount != m.Amount {
			t.Errorf("links[%d] = %+v, want Name=%q Amount=%d", i, links[i], m.Name, m.Amount)
		}
	}
}
