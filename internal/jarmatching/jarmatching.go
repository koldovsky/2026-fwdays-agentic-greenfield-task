// Package jarmatching matches parsed plan entries against fetched monobank
// jars: exact case-insensitive title matching, UAH-currency eligibility
// filtering, and unknown/ambiguous-name detection.
package jarmatching

import (
	"fmt"
	"strings"

	"md/agentic/monojar/internal/monoclient"
	"md/agentic/monojar/internal/planparsing"
)

const uahCurrencyCode = 980

// Reasons a plan entry was skipped instead of matched. Duplicate plan
// names are not this package's concern — plan-parsing already drops them
// before jar-matching runs.
const (
	ReasonUnknown   = "unknown jar name"
	ReasonNonUAH    = "jar name matches only non-UAH jar(s)"
	ReasonAmbiguous = "jar name matches more than one UAH jar"
)

// Matched is a plan entry resolved to exactly one eligible jar.
type Matched struct {
	Name   string
	Amount int
	SendID string
}

// Warning describes a plan entry that was skipped instead of matched.
type Warning struct {
	Name   string
	Amount int
	Reason string
}

// MatchJars resolves each entry in plan against jars, in plan order. A
// plan name matches a jar when it case-insensitively (Unicode-aware)
// equals the jar's Title as a full string; only jars with CurrencyCode ==
// 980 (UAH) are eligible to be matched. Every entry that is not an
// unambiguous single-UAH-jar match produces a Warning instead of a
// Matched result — never a guess.
func MatchJars(plan planparsing.Plan, jars []monoclient.Jar) ([]Matched, []Warning) {
	availableNames := uahJarTitles(jars)

	var matched []Matched
	var warnings []Warning
	for _, entry := range plan.Entries {
		titleMatches := jarsWithTitle(jars, entry.Name)
		if len(titleMatches) == 0 {
			warnings = append(warnings, Warning{
				Name:   entry.Name,
				Amount: entry.Amount,
				Reason: fmt.Sprintf("%s; available jars: %s", ReasonUnknown, strings.Join(availableNames, ", ")),
			})
			continue
		}

		uahMatches := filterUAH(titleMatches)
		switch len(uahMatches) {
		case 0:
			warnings = append(warnings, Warning{Name: entry.Name, Amount: entry.Amount, Reason: ReasonNonUAH})
		case 1:
			matched = append(matched, Matched{
				Name:   entry.Name,
				Amount: entry.Amount,
				SendID: uahMatches[0].SendID,
			})
		default:
			warnings = append(warnings, Warning{Name: entry.Name, Amount: entry.Amount, Reason: ReasonAmbiguous})
		}
	}

	return matched, warnings
}

// jarsWithTitle returns every jar (any currency) whose Title
// case-insensitively (Unicode-aware) equals name.
func jarsWithTitle(jars []monoclient.Jar, name string) []monoclient.Jar {
	var out []monoclient.Jar
	for _, j := range jars {
		if strings.EqualFold(j.Title, name) {
			out = append(out, j)
		}
	}
	return out
}

func filterUAH(jars []monoclient.Jar) []monoclient.Jar {
	var out []monoclient.Jar
	for _, j := range jars {
		if j.CurrencyCode == uahCurrencyCode {
			out = append(out, j)
		}
	}
	return out
}

// uahJarTitles returns the deduplicated titles of UAH-eligible jars, used
// to help the user fix typos in an unknown-name warning.
func uahJarTitles(jars []monoclient.Jar) []string {
	seen := make(map[string]bool, len(jars))
	var titles []string
	for _, j := range jars {
		if j.CurrencyCode != uahCurrencyCode || seen[j.Title] {
			continue
		}
		seen[j.Title] = true
		titles = append(titles, j.Title)
	}
	return titles
}
