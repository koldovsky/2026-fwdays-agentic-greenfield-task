// Package planparsing parses and validates a jarsplit plan file into an
// ordered list of jar-name/amount entries. Each data line follows the
// grammar "<amount> - <jar name>": the amount comes first, separated from
// the jar name by the first '-'.
package planparsing

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"
	"unicode"
)

// Entry is a single validated plan line: a jar name and the amount to send
// to it, along with the line number it came from.
type Entry struct {
	Name   string
	Amount int
	Line   int
}

// Warning describes a plan line (or set of lines) that was skipped instead
// of producing an Entry.
type Warning struct {
	Lines  []int
	Name   string
	Reason string
}

// Plan is the result of parsing a plan file: the valid entries, in file
// order.
type Plan struct {
	Entries []Entry
}

// ParsePlan parses plan text from r into a Plan and a list of warnings for
// any skipped lines. It never returns an error: malformed or duplicate
// lines are reported as warnings, not failures.
func ParsePlan(r io.Reader) (Plan, []Warning) {
	var candidates []Entry
	var warnings []Warning

	scanner := bufio.NewScanner(r)
	lineNum := 0
	for scanner.Scan() {
		lineNum++
		line := stripComment(scanner.Text())
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// Split on the first '-': the amount comes first, the entire
		// remainder is the jar name (so a jar name may contain '-').
		amountStr, name, ok := strings.Cut(line, "-")
		amountStr = strings.TrimSpace(amountStr)
		name = strings.TrimSpace(name)
		if !ok {
			warnings = append(warnings, Warning{
				Lines:  []int{lineNum},
				Reason: "missing '-' separator",
			})
			continue
		}

		// Strip internal whitespace so a thousands space parses (e.g.
		// "12 000" -> "12000"). Non-whitespace separators ('_', ',') and
		// decimals are left in place, so strconv.Atoi still rejects them.
		amount, err := strconv.Atoi(strings.Join(strings.Fields(amountStr), ""))
		if err != nil || amount <= 0 {
			warnings = append(warnings, Warning{
				Lines:  []int{lineNum},
				Name:   name,
				Reason: fmt.Sprintf("invalid amount %q: must be a positive whole integer", amountStr),
			})
			continue
		}

		if name == "" {
			warnings = append(warnings, Warning{
				Lines:  []int{lineNum},
				Reason: "empty jar name",
			})
			continue
		}

		candidates = append(candidates, Entry{Name: name, Amount: amount, Line: lineNum})
	}

	entries, dupWarnings := dropDuplicates(candidates)
	warnings = append(warnings, dupWarnings...)

	return Plan{Entries: entries}, warnings
}

// ParsePlanFile opens path and parses it with ParsePlan. A missing or
// unreadable path is returned as a fatal error, distinct from the
// per-line warnings ParsePlan produces.
func ParsePlanFile(path string) (Plan, []Warning, error) {
	f, err := os.Open(path)
	if err != nil {
		return Plan{}, nil, fmt.Errorf("read plan file: %w", err)
	}
	defer f.Close()

	plan, warnings := ParsePlan(f)
	return plan, warnings, nil
}

// stripComment strips a trailing '#' comment. A '#' begins a comment when
// it is the first non-whitespace character of the line or is preceded by
// whitespace; a '#' adjacent to non-space text is left as literal content.
func stripComment(line string) string {
	runes := []rune(line)
	prevIsSpace := true
	for i, r := range runes {
		if r == '#' && prevIsSpace {
			return string(runes[:i])
		}
		prevIsSpace = unicode.IsSpace(r)
	}
	return line
}

// dropDuplicates removes every entry whose name appears more than once
// among candidates, preserving the original order of the survivors, and
// returns one Warning per duplicated name listing all of its line numbers.
func dropDuplicates(candidates []Entry) ([]Entry, []Warning) {
	linesByName := make(map[string][]int, len(candidates))
	for _, e := range candidates {
		linesByName[e.Name] = append(linesByName[e.Name], e.Line)
	}

	var entries []Entry
	var warnings []Warning
	seen := make(map[string]bool, len(linesByName))
	for _, e := range candidates {
		if len(linesByName[e.Name]) > 1 {
			if !seen[e.Name] {
				seen[e.Name] = true
				warnings = append(warnings, Warning{
					Lines:  linesByName[e.Name],
					Name:   e.Name,
					Reason: "duplicate jar name",
				})
			}
			continue
		}
		entries = append(entries, e)
	}

	return entries, warnings
}
