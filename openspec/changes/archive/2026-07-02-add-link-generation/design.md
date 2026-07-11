## Context

`internal/jarmatching` already exports `Matched{Name string, Amount int,
SendID string}` for every plan entry that unambiguously resolved to a
single UAH jar. `link-generation` is the smallest capability in the
pipeline: it has exactly one job — turn each `Matched` into a
`send.monobank.ua` URL with the amount pre-filled — and no ambiguity of
its own to resolve (that's already been settled by `jar-matching`).

The one fact this capability cannot verify statically is whether
`send.monobank.ua`'s `?a=` query parameter is interpreted as hryvnia or
kopiykas. `product-requirements.md` already investigated this
(front-end validation text says «Сума переказу (грн)») and concluded UAH
1:1, but flags it as **V-1**: a runtime gate that must be checked against
a real link before FR-LINK-01 may move from `accepted` to `shipped`.

## Goals / Non-Goals

**Goals:**
- Pure function: `[]jarmatching.Matched → []Link`, no I/O, no network —
  string construction only.
- Output shape carries exactly what `output-reporting` (Phase 4) needs to
  render a table row: name, amount, URL.
- Preserve the input order — `jar-matching` already guarantees plan order,
  so this capability must not reorder or resort.
- Never include `MONO_TOKEN` or any data beyond `sendId`/`amount` in the
  generated URL (NFR-SEC-04) — trivially true given the input type only
  carries those fields, but worth a test to lock it in.
- Record the V-1 manual verification step as a task, so it isn't lost
  before FR-LINK-01 ships.

**Non-Goals:**
- No HTTP calls, no opening a browser (`--open` was already dropped from
  scope in `product-requirements.md`'s Deviations section).
- No amount formatting/currency symbol rendering (`₴`) — that's
  `output-reporting`'s job (FR-OUTPUT-02).
- No re-validation of the amount or `sendId` — both already passed through
  `plan-parsing`'s positive-integer check and `mono-client`'s API-sourced
  `sendId`; this capability trusts its input types.

## Decisions

**1. `fmt.Sprintf`, not `net/url.Values`, for query construction.**
The link is `https://send.monobank.ua/jar/{sendId}?a={amount}` built with
`fmt.Sprintf("https://send.monobank.ua/jar/%s?a=%d", sendID, amount)`.
Alternative considered: build the query string via `url.Values{"a":
...}.Encode()` for automatic escaping. Rejected — `sendId` comes straight
from monobank's own `client-info` response (alphanumeric jar identifiers,
not user input) and `amount` is a Go `int` that already passed
`plan-parsing`'s positive-whole-integer check, so there is nothing to
escape. Introducing `net/url` here would add ceremony without closing any
real gap, and keeps this capability a one-function package.

**2. Output type is `Link{Name, Amount, URL}`, not a bare `[]string`.**
`output-reporting` needs the name and amount alongside the URL to render
its table row (FR-OUTPUT-01/02) — recomputing them from the original
`Matched` slice in parallel would just be re-deriving data this capability
already has in hand. Returning a self-contained `Link` per matched entry
keeps the Phase 4 capability from having to zip two slices back together.

**3. `GenerateLinks` takes and returns a slice, order preserved 1:1.**
`GenerateLinks(matched []jarmatching.Matched) []Link` maps each input
entry to exactly one output entry at the same index. No sorting, no
deduplication (already done upstream by `plan-parsing`'s duplicate
detection and `jar-matching`'s ambiguity detection) — this stage cannot
introduce new order or grouping decisions.

**4. Base URL is a package-level constant.** `jarLinkBaseURL =
"https://send.monobank.ua/jar/"` is not user-configurable and not read
from environment — the tool has exactly one target host by design
(BC-SCOPE-01: own jars only), so there is no reason to parameterize it.

## Risks / Trade-offs

- **Risk:** V-1 (UAH vs. kopiykas on `?a=`) turns out to be wrong once
  checked against a real link. → **Mitigation:** the task list includes an
  explicit manual-verification task before this capability's requirement
  is considered `shipped`; if it fails, the fix is a one-line change to
  the `%d` formatting (multiply by 100), isolated to `buildURL`.
- **Risk:** monobank changes `sendId` to include characters that need URL
  escaping (e.g. adds a scheme where IDs contain slashes). →
  **Mitigation:** low likelihood given the current API contract
  (`TC-SCHEMA-01`), and if it happens, swapping `fmt.Sprintf` for
  `url.PathEscape(sendID)` is a contained change to `buildURL` with no
  ripple into callers, since the function signature doesn't change.
- **Trade-off:** No defensive re-validation of `amount > 0` here, trusting
  `plan-parsing`'s guarantee. Accepted because `Matched` is only ever
  constructed by `jar-matching` from already-validated `Entry` values —
  re-checking would duplicate a guarantee the type system + package
  boundary already gives us.

## Open Questions

None left open in code — the only open question (units of `?a=`) is
resolved by design and closed out via the V-1 manual check recorded in
`tasks.md`, not left as an implementation ambiguity.
