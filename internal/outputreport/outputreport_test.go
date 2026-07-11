package outputreport

import (
	"bytes"
	"strings"
	"testing"

	"md/agentic/monojar/internal/jarmatching"
	"md/agentic/monojar/internal/linkgen"
	"md/agentic/monojar/internal/planparsing"
)

func TestWriteTable_RowsAndTotal(t *testing.T) {
	links := []linkgen.Link{
		{Name: "Заощадження", Amount: 5000, URL: "https://send.monobank.ua/jar/sid-1?a=5000"},
		{Name: "Подорожі", Amount: 3000, URL: "https://send.monobank.ua/jar/sid-2?a=3000"},
		{Name: "Подушка", Amount: 1500, URL: "https://send.monobank.ua/jar/sid-3?a=1500"},
	}

	var buf bytes.Buffer
	if err := WriteTable(&buf, links); err != nil {
		t.Fatalf("WriteTable() error = %v", err)
	}
	out := buf.String()

	for _, want := range []string{
		"Заощадження", "5000 ₴", "https://send.monobank.ua/jar/sid-1?a=5000",
		"Подорожі", "3000 ₴", "https://send.monobank.ua/jar/sid-2?a=3000",
		"Подушка", "1500 ₴", "https://send.monobank.ua/jar/sid-3?a=1500",
		"Разом", "9500 ₴",
	} {
		if !strings.Contains(out, want) {
			t.Errorf("output missing %q; got:\n%s", want, out)
		}
	}
}

func TestWriteTable_EmptyLinksStillPrintsZeroTotal(t *testing.T) {
	var buf bytes.Buffer
	if err := WriteTable(&buf, nil); err != nil {
		t.Fatalf("WriteTable() error = %v", err)
	}
	out := buf.String()
	if !strings.Contains(out, "Разом") || !strings.Contains(out, "0 ₴") {
		t.Errorf("output = %q, want a Разом total of 0 ₴", out)
	}
	if strings.Count(out, "\n") != 1 {
		t.Errorf("output = %q, want exactly one line (the total)", out)
	}
}

func TestWriteTable_AmountColumnAligns(t *testing.T) {
	links := []linkgen.Link{
		{Name: "Заощадження", Amount: 5000, URL: "https://send.monobank.ua/jar/sid-1?a=5000"},
		{Name: "Подорожі", Amount: 3000, URL: "https://send.monobank.ua/jar/sid-2?a=3000"},
	}

	var buf bytes.Buffer
	if err := WriteTable(&buf, links); err != nil {
		t.Fatalf("WriteTable() error = %v", err)
	}

	lines := strings.Split(strings.TrimRight(buf.String(), "\n"), "\n")
	if len(lines) != 3 {
		t.Fatalf("got %d lines, want 3 (2 jar rows + total)", len(lines))
	}

	amountColumn := func(line string) int {
		idx := strings.Index(line, "₴")
		if idx == -1 {
			t.Fatalf("line %q has no amount", line)
		}
		for idx > 0 && line[idx-1] != ' ' {
			idx--
		}
		return len([]rune(line[:idx]))
	}

	want := amountColumn(lines[0])
	for _, l := range lines[1:] {
		if got := amountColumn(l); got != want {
			t.Errorf("amount column of %q starts at rune %d, want %d (misaligned)", l, got, want)
		}
	}
}

func TestWriteTable_ContainsNoWarningText(t *testing.T) {
	links := []linkgen.Link{{Name: "Заощадження", Amount: 5000, URL: "https://send.monobank.ua/jar/sid?a=5000"}}

	var buf bytes.Buffer
	if err := WriteTable(&buf, links); err != nil {
		t.Fatalf("WriteTable() error = %v", err)
	}
	if strings.Contains(buf.String(), "warning") {
		t.Errorf("stdout table unexpectedly contains warning text: %q", buf.String())
	}
}

func TestWriteWarnings_EachKind(t *testing.T) {
	tests := []struct {
		name          string
		parseWarnings []planparsing.Warning
		matchWarnings []jarmatching.Warning
		want          string
	}{
		{
			name:          "missing separator",
			parseWarnings: []planparsing.Warning{{Lines: []int{4}, Reason: "missing '-' separator"}},
			want:          "warning: line 4: missing '-' separator",
		},
		{
			name:          "empty jar name",
			parseWarnings: []planparsing.Warning{{Lines: []int{5}, Reason: "empty jar name"}},
			want:          "warning: line 5: empty jar name",
		},
		{
			name:          "invalid amount",
			parseWarnings: []planparsing.Warning{{Lines: []int{6}, Name: "Подорожі", Reason: `invalid amount "abc": must be a positive whole integer`}},
			want:          `warning: line 6: Подорожі: invalid amount "abc": must be a positive whole integer`,
		},
		{
			name:          "duplicate",
			parseWarnings: []planparsing.Warning{{Lines: []int{2, 5}, Name: "Заощадження", Reason: "duplicate jar name"}},
			want:          "warning: lines 2, 5: Заощадження: duplicate jar name",
		},
		{
			name:          "unknown",
			matchWarnings: []jarmatching.Warning{{Name: "Типо", Amount: 100, Reason: jarmatching.ReasonUnknown}},
			want:          "warning: Типо: " + jarmatching.ReasonUnknown,
		},
		{
			name:          "non-UAH",
			matchWarnings: []jarmatching.Warning{{Name: "Подорожі", Amount: 3000, Reason: jarmatching.ReasonNonUAH}},
			want:          "warning: Подорожі: " + jarmatching.ReasonNonUAH,
		},
		{
			name:          "ambiguous",
			matchWarnings: []jarmatching.Warning{{Name: "Подушка", Amount: 1500, Reason: jarmatching.ReasonAmbiguous}},
			want:          "warning: Подушка: " + jarmatching.ReasonAmbiguous,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var buf bytes.Buffer
			if err := WriteWarnings(&buf, nil, tt.parseWarnings, tt.matchWarnings); err != nil {
				t.Fatalf("WriteWarnings() error = %v", err)
			}
			if out := buf.String(); !strings.Contains(out, tt.want) {
				t.Errorf("output %q missing %q", out, tt.want)
			}
		})
	}
}

func TestWriteWarnings_OrderIsParseBeforeMatchPreservingGroupOrder(t *testing.T) {
	parseWarnings := []planparsing.Warning{
		{Lines: []int{1}, Reason: "missing '-' separator"},
		{Lines: []int{2}, Name: "Заощадження", Reason: "duplicate jar name"},
	}
	matchWarnings := []jarmatching.Warning{
		{Name: "Типо", Amount: 100, Reason: jarmatching.ReasonUnknown},
		{Name: "Подушка", Amount: 1500, Reason: jarmatching.ReasonAmbiguous},
	}

	var buf bytes.Buffer
	if err := WriteWarnings(&buf, nil, parseWarnings, matchWarnings); err != nil {
		t.Fatalf("WriteWarnings() error = %v", err)
	}

	lines := strings.Split(strings.TrimRight(buf.String(), "\n"), "\n")
	if len(lines) != 5 { // 2 parse + 2 match + 1 reconciliation
		t.Fatalf("got %d lines, want 5:\n%s", len(lines), buf.String())
	}
	wantOrder := []string{"missing '-' separator", "duplicate jar name", "Типо", "Подушка"}
	for i, want := range wantOrder {
		if !strings.Contains(lines[i], want) {
			t.Errorf("line %d = %q, want to contain %q", i, lines[i], want)
		}
	}
}

func TestWriteWarnings_ReconciliationTotals(t *testing.T) {
	links := []linkgen.Link{
		{Name: "Заощадження", Amount: 5000, URL: "u1"},
		{Name: "Подорожі", Amount: 3000, URL: "u2"},
	}
	parseWarnings := []planparsing.Warning{
		{Lines: []int{9}, Reason: "empty jar name"}, // must not affect totals
	}
	matchWarnings := []jarmatching.Warning{
		{Name: "Подушка", Amount: 1500, Reason: jarmatching.ReasonAmbiguous},
	}

	var buf bytes.Buffer
	if err := WriteWarnings(&buf, links, parseWarnings, matchWarnings); err != nil {
		t.Fatalf("WriteWarnings() error = %v", err)
	}
	out := buf.String()

	for _, want := range []string{"9500 ₴", "1500 ₴", "1 jar"} {
		if !strings.Contains(out, want) {
			t.Errorf("output %q missing %q", out, want)
		}
	}
}

func TestWriteWarnings_NoReconciliationWhenNoMatchWarnings(t *testing.T) {
	parseWarnings := []planparsing.Warning{{Lines: []int{3}, Reason: "empty jar name"}}

	var buf bytes.Buffer
	if err := WriteWarnings(&buf, nil, parseWarnings, nil); err != nil {
		t.Fatalf("WriteWarnings() error = %v", err)
	}
	out := buf.String()
	if strings.Contains(out, "planned") || strings.Contains(out, "skipped") {
		t.Errorf("output %q unexpectedly contains a reconciliation line", out)
	}
	if strings.Count(out, "\n") != 1 {
		t.Errorf("output = %q, want exactly one line (the parse warning)", out)
	}
}

func TestWriteWarnings_ContainsNoTableText(t *testing.T) {
	links := []linkgen.Link{{Name: "Заощадження", Amount: 5000, URL: "https://send.monobank.ua/jar/sid?a=5000"}}
	matchWarnings := []jarmatching.Warning{{Name: "Типо", Amount: 100, Reason: jarmatching.ReasonUnknown}}

	var buf bytes.Buffer
	if err := WriteWarnings(&buf, links, nil, matchWarnings); err != nil {
		t.Fatalf("WriteWarnings() error = %v", err)
	}
	out := buf.String()
	if strings.Contains(out, "Разом") || strings.Contains(out, links[0].URL) {
		t.Errorf("stderr warnings unexpectedly contains table content: %q", out)
	}
}

func TestRendering_IsDeterministic(t *testing.T) {
	links := []linkgen.Link{
		{Name: "Заощадження", Amount: 5000, URL: "https://send.monobank.ua/jar/sid-1?a=5000"},
		{Name: "Подорожі", Amount: 3000, URL: "https://send.monobank.ua/jar/sid-2?a=3000"},
	}
	parseWarnings := []planparsing.Warning{{Lines: []int{9}, Reason: "empty jar name"}}
	matchWarnings := []jarmatching.Warning{{Name: "Подушка", Amount: 1500, Reason: jarmatching.ReasonAmbiguous}}

	render := func() (string, string) {
		var stdout, stderr bytes.Buffer
		if err := WriteTable(&stdout, links); err != nil {
			t.Fatalf("WriteTable() error = %v", err)
		}
		if err := WriteWarnings(&stderr, links, parseWarnings, matchWarnings); err != nil {
			t.Fatalf("WriteWarnings() error = %v", err)
		}
		return stdout.String(), stderr.String()
	}

	stdout1, stderr1 := render()
	stdout2, stderr2 := render()

	if stdout1 != stdout2 {
		t.Errorf("stdout not deterministic:\n%q\nvs\n%q", stdout1, stdout2)
	}
	if stderr1 != stderr2 {
		t.Errorf("stderr not deterministic:\n%q\nvs\n%q", stderr1, stderr2)
	}
}
