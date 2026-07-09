package planparsing

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestParsePlan_Grammar(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		entries []Entry
	}{
		{
			name:    "trims whitespace around amount and name",
			input:   "  5000  -  Заощадження  ",
			entries: []Entry{{Name: "Заощадження", Amount: 5000, Line: 1}},
		},
		{
			name:    "blank and whitespace-only lines are skipped silently",
			input:   "3000 - Подорожі\n\n   \n1500 - Подушка",
			entries: []Entry{{Name: "Подорожі", Amount: 3000, Line: 1}, {Name: "Подушка", Amount: 1500, Line: 4}},
		},
		{
			name:    "leading '#' comment line is skipped",
			input:   "# this is a note\n5000 - Заощадження",
			entries: []Entry{{Name: "Заощадження", Amount: 5000, Line: 2}},
		},
		{
			name:    "inline trailing comment after whitespace is stripped",
			input:   "5000 - Заощ. # note",
			entries: []Entry{{Name: "Заощ.", Amount: 5000, Line: 1}},
		},
		{
			name:    "'#' adjacent to non-space text is literal",
			input:   "100 - C#фонд",
			entries: []Entry{{Name: "C#фонд", Amount: 100, Line: 1}},
		},
		{
			name:    "jar name may contain a hyphen",
			input:   "5000 - новий-рік",
			entries: []Entry{{Name: "новий-рік", Amount: 5000, Line: 1}},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			plan, warnings := ParsePlan(strings.NewReader(tc.input))
			if len(warnings) != 0 {
				t.Fatalf("unexpected warnings: %+v", warnings)
			}
			assertEntriesEqual(t, tc.entries, plan.Entries)
		})
	}
}

func TestParsePlan_AmountValidation(t *testing.T) {
	valid := []struct {
		name  string
		input string
		want  int
	}{
		{"positive whole integer", "3000 - Подорожі", 3000},
		{"amount with an internal space", "12 000 - donates", 12000},
	}
	for _, tc := range valid {
		t.Run(tc.name, func(t *testing.T) {
			plan, warnings := ParsePlan(strings.NewReader(tc.input))
			if len(warnings) != 0 {
				t.Fatalf("unexpected warnings: %+v", warnings)
			}
			if len(plan.Entries) != 1 || plan.Entries[0].Amount != tc.want {
				t.Fatalf("got entries %+v, want amount %d", plan.Entries, tc.want)
			}
		})
	}

	malformed := []struct {
		name  string
		input string
	}{
		{"zero amount", "0 - Подушка"},
		{"negative amount", "-100 - Подушка"},
		{"decimal amount", "100.50 - Подушка"},
		{"underscore separator", "1_000 - Подушка"},
		{"comma separator", "1,000 - Подушка"},
	}
	for _, tc := range malformed {
		t.Run(tc.name, func(t *testing.T) {
			plan, warnings := ParsePlan(strings.NewReader(tc.input))
			if len(plan.Entries) != 0 {
				t.Fatalf("expected no entries, got %+v", plan.Entries)
			}
			if len(warnings) != 1 {
				t.Fatalf("expected 1 warning, got %+v", warnings)
			}
		})
	}
}

func TestParsePlan_MalformedLines(t *testing.T) {
	t.Run("line without '-' is skipped with a warning", func(t *testing.T) {
		plan, warnings := ParsePlan(strings.NewReader("this has no separator"))
		if len(plan.Entries) != 0 {
			t.Fatalf("expected no entries, got %+v", plan.Entries)
		}
		if len(warnings) != 1 || warnings[0].Lines[0] != 1 {
			t.Fatalf("expected 1 warning for line 1, got %+v", warnings)
		}
		if warnings[0].Reason != "missing '-' separator" {
			t.Fatalf("got reason %q, want %q", warnings[0].Reason, "missing '-' separator")
		}
	})

	t.Run("old '=' grammar line is skipped with a warning", func(t *testing.T) {
		plan, warnings := ParsePlan(strings.NewReader("Заощадження = 5000"))
		if len(plan.Entries) != 0 {
			t.Fatalf("expected no entries, got %+v", plan.Entries)
		}
		if len(warnings) != 1 || warnings[0].Reason != "missing '-' separator" {
			t.Fatalf("expected a missing-'-'-separator warning, got %+v", warnings)
		}
	})

	t.Run("line with empty name is skipped with a warning", func(t *testing.T) {
		plan, warnings := ParsePlan(strings.NewReader("5000 -"))
		if len(plan.Entries) != 0 {
			t.Fatalf("expected no entries, got %+v", plan.Entries)
		}
		if len(warnings) != 1 || warnings[0].Lines[0] != 1 {
			t.Fatalf("expected 1 warning for line 1, got %+v", warnings)
		}
		if warnings[0].Reason != "empty jar name" {
			t.Fatalf("got reason %q, want %q", warnings[0].Reason, "empty jar name")
		}
	})

	t.Run("malformed line does not block remaining valid lines", func(t *testing.T) {
		plan, warnings := ParsePlan(strings.NewReader("no separator here\n5000 - Заощадження"))
		assertEntriesEqual(t, []Entry{{Name: "Заощадження", Amount: 5000, Line: 2}}, plan.Entries)
		if len(warnings) != 1 {
			t.Fatalf("expected 1 warning, got %+v", warnings)
		}
	})
}

func TestParsePlan_Duplicates(t *testing.T) {
	t.Run("same name on multiple lines is skipped for all occurrences", func(t *testing.T) {
		input := "5000 - Заощадження\n3000 - Подорожі\n2000 - Заощадження"
		plan, warnings := ParsePlan(strings.NewReader(input))
		assertEntriesEqual(t, []Entry{{Name: "Подорожі", Amount: 3000, Line: 2}}, plan.Entries)
		if len(warnings) != 1 {
			t.Fatalf("expected 1 warning, got %+v", warnings)
		}
	})

	t.Run("duplicate warning lists all offending line numbers", func(t *testing.T) {
		input := "5000 - Заощадження\n3000 - Подорожі\n2000 - Заощадження"
		_, warnings := ParsePlan(strings.NewReader(input))
		if len(warnings) != 1 {
			t.Fatalf("expected 1 warning, got %+v", warnings)
		}
		got := warnings[0].Lines
		if len(got) != 2 || got[0] != 1 || got[1] != 3 {
			t.Fatalf("expected lines [1 3], got %v", got)
		}
	})

	t.Run("three occurrences all reported", func(t *testing.T) {
		input := "100 - Подушка\n200 - Подушка\n300 - Подушка"
		plan, warnings := ParsePlan(strings.NewReader(input))
		if len(plan.Entries) != 0 {
			t.Fatalf("expected no entries, got %+v", plan.Entries)
		}
		if len(warnings) != 1 {
			t.Fatalf("expected 1 warning, got %+v", warnings)
		}
		got := warnings[0].Lines
		if len(got) != 3 || got[0] != 1 || got[1] != 2 || got[2] != 3 {
			t.Fatalf("expected lines [1 2 3], got %v", got)
		}
	})
}

func TestParsePlan_Order(t *testing.T) {
	input := "5000 - Заощадження\nbroken line\n1 - Заощадження\n3000 - Подорожі\n1500 - Подушка"
	plan, warnings := ParsePlan(strings.NewReader(input))
	assertEntriesEqual(t, []Entry{
		{Name: "Подорожі", Amount: 3000, Line: 4},
		{Name: "Подушка", Amount: 1500, Line: 5},
	}, plan.Entries)
	if len(warnings) != 2 {
		t.Fatalf("expected 2 warnings (malformed line + duplicate), got %+v", warnings)
	}
}

func TestParsePlan_CRLF(t *testing.T) {
	input := "5000 - Заощадження\r\n3000 - Подорожі\r\n"
	plan, warnings := ParsePlan(strings.NewReader(input))
	if len(warnings) != 0 {
		t.Fatalf("unexpected warnings: %+v", warnings)
	}
	assertEntriesEqual(t, []Entry{
		{Name: "Заощадження", Amount: 5000, Line: 1},
		{Name: "Подорожі", Amount: 3000, Line: 2},
	}, plan.Entries)
}

func TestParsePlanFile(t *testing.T) {
	t.Run("valid path returns entries matching ParsePlan", func(t *testing.T) {
		dir := t.TempDir()
		path := filepath.Join(dir, "plan.txt")
		content := "5000 - Заощадження\n3000 - Подорожі\n"
		if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
			t.Fatalf("write fixture: %v", err)
		}

		gotPlan, gotWarnings, err := ParsePlanFile(path)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		wantPlan, wantWarnings := ParsePlan(strings.NewReader(content))
		assertEntriesEqual(t, wantPlan.Entries, gotPlan.Entries)
		if len(gotWarnings) != len(wantWarnings) {
			t.Fatalf("got warnings %+v, want %+v", gotWarnings, wantWarnings)
		}
	})

	t.Run("missing path is a fatal error", func(t *testing.T) {
		dir := t.TempDir()
		path := filepath.Join(dir, "does-not-exist.txt")

		plan, warnings, err := ParsePlanFile(path)
		if err == nil {
			t.Fatal("expected an error for a missing path")
		}
		if !errors.Is(err, os.ErrNotExist) {
			t.Fatalf("expected a not-exist error, got %v", err)
		}
		if len(plan.Entries) != 0 || warnings != nil {
			t.Fatalf("expected no partial results, got plan=%+v warnings=%+v", plan, warnings)
		}
	})

	t.Run("unreadable path is a fatal error", func(t *testing.T) {
		dir := t.TempDir()
		path := filepath.Join(dir, "plan.txt")
		if err := os.WriteFile(path, []byte("5000 - Заощадження\n"), 0o000); err != nil {
			t.Fatalf("write fixture: %v", err)
		}
		if os.Getuid() == 0 {
			t.Skip("running as root, file permissions are not enforced")
		}

		plan, warnings, err := ParsePlanFile(path)
		if err == nil {
			t.Fatal("expected an error for an unreadable path")
		}
		if len(plan.Entries) != 0 || warnings != nil {
			t.Fatalf("expected no partial results, got plan=%+v warnings=%+v", plan, warnings)
		}
	})
}

func assertEntriesEqual(t *testing.T, want, got []Entry) {
	t.Helper()
	if len(want) != len(got) {
		t.Fatalf("got %d entries %+v, want %d entries %+v", len(got), got, len(want), want)
	}
	for i := range want {
		if want[i] != got[i] {
			t.Fatalf("entry %d: got %+v, want %+v", i, got[i], want[i])
		}
	}
}
