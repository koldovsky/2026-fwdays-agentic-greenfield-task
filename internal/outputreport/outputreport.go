// Package outputreport renders the jarsplit pipeline's results for the
// user: a stdout table of emitted links with a total, and stderr warnings
// for every plan line or jar name that was skipped instead of matched,
// plus a skip-reconciliation total. It performs no I/O beyond writing to
// the io.Writers it is given.
package outputreport

import (
	"fmt"
	"io"
	"strconv"
	"strings"
	"text/tabwriter"

	"md/agentic/monojar/internal/jarmatching"
	"md/agentic/monojar/internal/linkgen"
	"md/agentic/monojar/internal/planparsing"
)

// WriteTable renders links as a table (name, amount, URL) on w, in the
// given order, followed by a "Разом" total line summing every link's
// amount.
func WriteTable(w io.Writer, links []linkgen.Link) error {
	tw := tabwriter.NewWriter(w, 0, 0, 2, ' ', 0)
	for _, l := range links {
		if _, err := fmt.Fprintf(tw, "%s\t%s\t%s\n", l.Name, formatAmount(l.Amount), l.URL); err != nil {
			return err
		}
	}
	if _, err := fmt.Fprintf(tw, "Разом\t%s\t\n", formatAmount(sumLinkAmounts(links))); err != nil {
		return err
	}
	return tw.Flush()
}

// WriteWarnings renders parseWarnings then matchWarnings on w as one line
// each, in their given order, followed by a skip-reconciliation line
// (planned total, skipped total, skipped count) whenever matchWarnings is
// non-empty. links is used only to compute the planned total.
func WriteWarnings(w io.Writer, links []linkgen.Link, parseWarnings []planparsing.Warning, matchWarnings []jarmatching.Warning) error {
	for _, pw := range parseWarnings {
		if _, err := fmt.Fprintln(w, formatParseWarning(pw)); err != nil {
			return err
		}
	}
	for _, mw := range matchWarnings {
		if _, err := fmt.Fprintln(w, formatMatchWarning(mw)); err != nil {
			return err
		}
	}

	if len(matchWarnings) == 0 {
		return nil
	}

	skippedTotal := sumWarningAmounts(matchWarnings)
	plannedTotal := sumLinkAmounts(links) + skippedTotal
	_, err := fmt.Fprintf(w, "warning: planned %s, skipped %s across %d jar(s)\n",
		formatAmount(plannedTotal), formatAmount(skippedTotal), len(matchWarnings))
	return err
}

// formatParseWarning renders a plan-parsing warning as
// "warning: line(s) <Lines>: [<Name>: ]<Reason>", omitting the name
// segment when the warning has no associated jar name (a missing '='
// separator or an empty name never resolved one).
func formatParseWarning(pw planparsing.Warning) string {
	loc := formatLines(pw.Lines)
	if pw.Name == "" {
		return fmt.Sprintf("warning: %s: %s", loc, pw.Reason)
	}
	return fmt.Sprintf("warning: %s: %s: %s", loc, pw.Name, pw.Reason)
}

// formatMatchWarning renders a jar-matching warning as
// "warning: <Name>: <Reason>". Match warnings aren't tied to a single
// source line once past parsing, so no location is rendered.
func formatMatchWarning(mw jarmatching.Warning) string {
	return fmt.Sprintf("warning: %s: %s", mw.Name, mw.Reason)
}

// formatLines renders a warning's source line numbers as "line N" for a
// single line or "lines N, M, ..." for more than one.
func formatLines(lines []int) string {
	strs := make([]string, len(lines))
	for i, l := range lines {
		strs[i] = strconv.Itoa(l)
	}
	if len(strs) == 1 {
		return "line " + strs[0]
	}
	return "lines " + strings.Join(strs, ", ")
}

// formatAmount renders amount with the hryvnia currency symbol
// (FR-OUTPUT-02).
func formatAmount(amount int) string {
	return fmt.Sprintf("%d ₴", amount)
}

func sumLinkAmounts(links []linkgen.Link) int {
	total := 0
	for _, l := range links {
		total += l.Amount
	}
	return total
}

func sumWarningAmounts(warnings []jarmatching.Warning) int {
	total := 0
	for _, w := range warnings {
		total += w.Amount
	}
	return total
}
