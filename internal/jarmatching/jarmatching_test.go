package jarmatching

import (
	"reflect"
	"strings"
	"testing"

	"md/agentic/monojar/internal/monoclient"
	"md/agentic/monojar/internal/planparsing"
)

func plan(entries ...planparsing.Entry) planparsing.Plan {
	return planparsing.Plan{Entries: entries}
}

func entry(name string, amount int) planparsing.Entry {
	return planparsing.Entry{Name: name, Amount: amount}
}

func jar(title, sendID string, currencyCode int) monoclient.Jar {
	return monoclient.Jar{Title: title, SendID: sendID, CurrencyCode: currencyCode}
}

func TestMatchJars_CaseInsensitiveMatching(t *testing.T) {
	jars := []monoclient.Jar{jar("Заощадження", "sid-1", uahCurrencyCode)}

	tests := []struct {
		name      string
		planName  string
		wantMatch bool
	}{
		{name: "exact match", planName: "Заощадження", wantMatch: true},
		{name: "lowercase matches", planName: "заощадження", wantMatch: true},
		{name: "uppercase matches", planName: "ЗАОЩАДЖЕННЯ", wantMatch: true},
		{name: "substring does not match", planName: "Заощ", wantMatch: false},
		{name: "superstring does not match", planName: "Заощадження Плюс", wantMatch: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			matched, warnings := MatchJars(plan(entry(tt.planName, 100)), jars)
			if tt.wantMatch {
				if len(matched) != 1 || len(warnings) != 0 {
					t.Fatalf("matched=%v warnings=%v, want one match and no warnings", matched, warnings)
				}
			} else {
				if len(matched) != 0 || len(warnings) != 1 {
					t.Fatalf("matched=%v warnings=%v, want no match and one warning", matched, warnings)
				}
			}
		})
	}
}

func TestMatchJars_NonUAHOnlyIsDistinctFromUnknown(t *testing.T) {
	jars := []monoclient.Jar{jar("Подорожі", "sid-usd", 840)}

	matched, warnings := MatchJars(plan(entry("Подорожі", 100)), jars)

	if len(matched) != 0 {
		t.Fatalf("matched = %v, want none", matched)
	}
	if len(warnings) != 1 {
		t.Fatalf("warnings = %v, want exactly one", warnings)
	}
	if warnings[0].Reason != ReasonNonUAH {
		t.Errorf("Reason = %q, want %q", warnings[0].Reason, ReasonNonUAH)
	}
}

func TestMatchJars_UnknownNameListsAvailableUAHTitles(t *testing.T) {
	jars := []monoclient.Jar{
		jar("Заощадження", "sid-1", uahCurrencyCode),
		jar("Подушка", "sid-2", uahCurrencyCode),
		jar("Подушка", "sid-3", uahCurrencyCode), // duplicate title, should dedupe in the hint
		jar("USD jar", "sid-4", 840),             // non-UAH, should not appear in the hint
	}

	_, warnings := MatchJars(plan(entry("Типо", 100)), jars)

	if len(warnings) != 1 {
		t.Fatalf("warnings = %v, want exactly one", warnings)
	}
	w := warnings[0]
	if w.Name != "Типо" {
		t.Errorf("Name = %q, want %q", w.Name, "Типо")
	}
	for _, want := range []string{"Заощадження", "Подушка"} {
		if !strings.Contains(w.Reason, want) {
			t.Errorf("Reason %q does not mention %q", w.Reason, want)
		}
	}
	if strings.Contains(w.Reason, "USD jar") {
		t.Errorf("Reason %q unexpectedly mentions non-UAH jar", w.Reason)
	}
	if strings.Count(w.Reason, "Подушка") != 1 {
		t.Errorf("Reason %q should mention duplicated title exactly once", w.Reason)
	}
}

func TestMatchJars_AmbiguousUAHTitleIsSkipped(t *testing.T) {
	jars := []monoclient.Jar{
		jar("Заощадження", "sid-1", uahCurrencyCode),
		jar("Заощадження", "sid-2", uahCurrencyCode),
	}

	matched, warnings := MatchJars(plan(entry("Заощадження", 100)), jars)

	if len(matched) != 0 {
		t.Fatalf("matched = %v, want none", matched)
	}
	if len(warnings) != 1 || warnings[0].Reason != ReasonAmbiguous {
		t.Fatalf("warnings = %v, want exactly one ambiguous warning", warnings)
	}
}

func TestMatchJars_PreservesPlanOrderRegardlessOfJarOrder(t *testing.T) {
	p := plan(entry("Подорожі", 3000), entry("Заощадження", 5000))
	jars := []monoclient.Jar{
		jar("Заощадження", "sid-save", uahCurrencyCode),
		jar("Подорожі", "sid-trip", uahCurrencyCode),
	}

	matched, warnings := MatchJars(p, jars)

	if len(warnings) != 0 {
		t.Fatalf("warnings = %v, want none", warnings)
	}
	want := []Matched{
		{Name: "Подорожі", Amount: 3000, SendID: "sid-trip"},
		{Name: "Заощадження", Amount: 5000, SendID: "sid-save"},
	}
	if !reflect.DeepEqual(matched, want) {
		t.Errorf("matched = %+v, want %+v", matched, want)
	}
}

func TestMatchJars_MixedScenario(t *testing.T) {
	p := plan(
		entry("Заощадження", 5000), // clean UAH match
		entry("Типо", 100),         // unknown
		entry("Подорожі", 3000),    // non-UAH-only match
		entry("Подушка", 1500),     // ambiguous
	)
	jars := []monoclient.Jar{
		jar("Заощадження", "sid-save", uahCurrencyCode),
		jar("Подорожі", "sid-trip-usd", 840),
		jar("Подушка", "sid-cushion-1", uahCurrencyCode),
		jar("Подушка", "sid-cushion-2", uahCurrencyCode),
	}

	matched, warnings := MatchJars(p, jars)

	wantMatched := []Matched{{Name: "Заощадження", Amount: 5000, SendID: "sid-save"}}
	if !reflect.DeepEqual(matched, wantMatched) {
		t.Errorf("matched = %+v, want %+v", matched, wantMatched)
	}

	if len(warnings) != 3 {
		t.Fatalf("warnings = %+v, want exactly 3", warnings)
	}
	if warnings[0].Name != "Типо" || !strings.Contains(warnings[0].Reason, ReasonUnknown) {
		t.Errorf("warnings[0] = %+v, want unknown warning for Типо", warnings[0])
	}
	if warnings[1].Name != "Подорожі" || warnings[1].Reason != ReasonNonUAH {
		t.Errorf("warnings[1] = %+v, want non-UAH warning for Подорожі", warnings[1])
	}
	if warnings[2].Name != "Подушка" || warnings[2].Reason != ReasonAmbiguous {
		t.Errorf("warnings[2] = %+v, want ambiguous warning for Подушка", warnings[2])
	}
}
