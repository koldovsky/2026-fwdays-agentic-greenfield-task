package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"time"

	"md/agentic/monojar/internal/jarmatching"
	"md/agentic/monojar/internal/linkgen"
	"md/agentic/monojar/internal/monoclient"
	"md/agentic/monojar/internal/outputreport"
	"md/agentic/monojar/internal/planparsing"
)

const fetchTimeout = 10 * time.Second

// run wires the jarsplit pipeline end to end: parse the plan, fetch jars,
// match, generate links, and render the result. It returns the process
// exit code; fetcher is injected so tests can supply canned jars or
// errors without a live network call.
func run(args []string, stdout, stderr io.Writer, fetcher monoclient.JarFetcher) int {
	if len(args) != 1 {
		fmt.Fprintln(stderr, "usage: jarsplit <plan-file>")
		return 2
	}

	plan, parseWarnings, err := planparsing.ParsePlanFile(args[0])
	if err != nil {
		fmt.Fprintf(stderr, "fatal: %v\n", err)
		return 2
	}
	if len(plan.Entries) == 0 {
		if err := outputreport.WriteWarnings(stderr, nil, parseWarnings, nil); err != nil {
			fmt.Fprintf(stderr, "fatal: writing warnings: %v\n", err)
			return 2
		}
		fmt.Fprintln(stderr, "fatal: plan has no valid entries")
		return 2
	}

	ctx, cancel := context.WithTimeout(context.Background(), fetchTimeout)
	defer cancel()

	jars, err := fetcher.FetchJars(ctx)
	if err != nil {
		fmt.Fprintln(stderr, describeFetchError(err))
		return 2
	}

	matched, matchWarnings := jarmatching.MatchJars(plan, jars)
	links := linkgen.GenerateLinks(matched)

	if err := outputreport.WriteTable(stdout, links); err != nil {
		fmt.Fprintf(stderr, "fatal: writing output: %v\n", err)
		return 2
	}
	if err := outputreport.WriteWarnings(stderr, links, parseWarnings, matchWarnings); err != nil {
		fmt.Fprintf(stderr, "fatal: writing warnings: %v\n", err)
		return 2
	}

	return exitCode(matched, parseWarnings, matchWarnings)
}

// exitCode implements FR-EXIT-01's three-tier contract. Every plan entry
// becomes exactly one Matched or one jarmatching.Warning, so
// len(matched) == 0 with a non-empty plan means nothing was resolvable.
func exitCode(matched []jarmatching.Matched, parseWarnings []planparsing.Warning, matchWarnings []jarmatching.Warning) int {
	switch {
	case len(matched) == 0:
		return 2
	case len(parseWarnings) > 0 || len(matchWarnings) > 0:
		return 1
	default:
		return 0
	}
}

// describeFetchError translates mono-client's fatal sentinel errors into
// one distinct, token-free message each (FR-FAIL-02). It matches on
// errors.Is against the sentinel values, not on error text, so wording
// changes inside mono-client can't silently break this mapping.
func describeFetchError(err error) string {
	switch {
	case errors.Is(err, monoclient.ErrMissingToken):
		return "fatal: MONO_TOKEN is not set"
	case errors.Is(err, monoclient.ErrInvalidToken):
		return "fatal: monobank rejected MONO_TOKEN (401 — invalid or expired)"
	case errors.Is(err, monoclient.ErrRateLimited):
		return "fatal: monobank rate-limited the request (429) — retry in about 60 seconds"
	case errors.Is(err, monoclient.ErrUnreachable):
		// err's text is dial-failure or "unexpected status NNN" detail from
		// monoclient, never the token, so it's safe to surface here — it's
		// often the only clue distinguishing a real network outage from an
		// unexpected API response (e.g. a 403 the token/permissions caused).
		return fmt.Sprintf("fatal: could not reach monobank (network error or timeout): %v", err)
	default:
		return fmt.Sprintf("fatal: %v", err)
	}
}
