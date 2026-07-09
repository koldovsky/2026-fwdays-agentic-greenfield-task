# `jarsplit` — current state

Tracks the last action taken in this repo, so the next agent or human knows
what happened and what to do next. Update this after completing a unit of work.

## Last action

**2026-07-09T19:26:44+00:00** — Changed the plan-file line grammar from
`Name = amount` to **`<amount> - <jar name>`** (amount first, separator `-`),
spec-first via the OpenSpec change `change-plan-syntax`. The line is split on
its **first** `-` (left = amount, remainder = jar name, so jar names may
contain `-`), and the amount now tolerates internal whitespace as a thousands
separator (`12 000` → `12000`) while `_`, `,`, decimals, zero, and negatives
stay malformed. The old `=` grammar is fully replaced — such lines now skip
with a `missing '-' separator` warning. Implementation is localized to
`internal/planparsing/planparsing.go` (split logic + amount whitespace
stripping + warning text) plus a comment in
`internal/outputreport/outputreport.go`; the `Entry`/`Warning`/`Plan` structs
and all downstream stages (matching, linkgen, output) were unchanged. Updated
the PRD (FR-INPUT-02, FR-PARSE-02, FR-AMOUNT-01, FR-MALFORMED-01), the brief
example, the OpenSpec delta specs (`plan-parsing`, `output-reporting`), all
affected tests (added `12 000`→12000 and name-with-hyphen cases), and
`sample-input.txt` (now a clean new-format example). Full suite
(`go test ./...`) passes. Also added a reusable `spec-driven-change` skill
(`.claude/skills/spec-driven-change/`) codifying this propose → gate → apply →
verify → archive workflow.

### Prior action

**2026-07-03T05:10:00+00:00** — Ran the built `jarsplit` binary against
the **live** monobank API for the first time (real `MONO_TOKEN`, real
`client-info` response). This surfaced a real bug that the fixture-based
tests never caught: `internal/linkgen/linkgen.go`'s `buildURL` assumed
`sendId` was a bare ID (per the brief's example `"4xR…"`) and
unconditionally prepended `"https://send.monobank.ua/jar/"`. The live
API actually returns `sendId` **already prefixed** with `"jar/"` (e.g.
`"jar/5x3KgGN3es"`), so every generated link was doubled —
`.../jar/jar/5x3KgGN3es?a=3000` — which would 404 in a browser. Fixed
by trimming a leading `"jar/"` off `sendID` before rejoining it onto
`jarLinkBaseURL`; added `TestGenerateLinks_SendIDWithJarPrefixIsNotDoubled`
as a regression test. Full suite (`go test ./...`) passes. Re-ran the
binary live against `sample-input.txt`: 3 malformed header lines
correctly skipped with warnings (no `=`), 3 valid jars
(Заощадження/На products/На донати) correctly matched, amounts summed
in `Разом`, links now well-formed, exit code `1` (partial success, as
expected given the malformed lines).

Separately (not code-related, flagged to the user directly): an
earlier debug `curl -v` call in this session echoed the then-current
`MONO_TOKEN` value into the conversation transcript. The user was told
to rotate it; the token used for the successful run above is the
rotated one.

## Next step

The **V-1** manual verification gate on `FR-LINK-01` is now *partially*
closed: link *shape* is confirmed correct against live data (this was
the doubled-`jar/` bug above). What's still unverified is the actual
gate condition — opening a real generated link in a browser and
confirming the prefilled amount reads `N ₴` (not kopiykas). That
requires a human with a browser; once done, flip `FR-LINK-01` from
`accepted` to `shipped` in `docs/product-requirements.md`. Also worth
a follow-up: `docs/product-brief.md`'s open-question note about
`sendId` looking like `"4xR…"` is now known to be inaccurate for real
jars (real `sendId`s carry a `"jar/"` prefix) — consider updating the
brief so future readers aren't misled the way the original code was.
