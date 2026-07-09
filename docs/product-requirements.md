# `jarsplit` — product requirements

This document is the **single source of truth** for what `jarsplit` does and what
constraints govern it. Every requirement has a stable ID. Specs, tests, PRs, and
recordings reference these IDs to keep traceability intact.

Refer to [product-brief.md](product-brief.md) for narrative context.

## ID conventions

| Prefix  | Meaning                    | Example                                          |
| ------- | -------------------------- | ------------------------------------------------ |
| `FR-*`  | Functional Requirement     | `FR-RESOLVE-02` — match jar name to title        |
| `NFR-*` | Non-Functional Requirement | `NFR-SEC-01` — token only from env               |
| `TC-*`  | Technical Constraint       | `TC-LANG-01` — Go 1.24.4                          |
| `BC-*`  | Business / UX Constraint   | `BC-SAFE-01` — never silently misroute money      |

**Status values:** `proposed` · `accepted` · `shipped` · `dropped`.

This is a **spec-first** document: the code does not exist yet, so requirements
are authored as decisions that drive the build. Most are `accepted`; none are
`shipped` until implemented and verified.

### Verified open questions from the brief

The brief flagged two unknowns. Both were investigated against live sources during
requirements grilling:

- **Units of `?a=`** — the `send.monobank.ua` transfer field is labeled
  «Сума переказу (грн)» (hryvnia). The front-end stores amounts internally in
  kopiykas (`minAUAH:1e4`, `minJarUAH:1e3`, `maxAUAH:1499900`) but validates the
  user-typed value in hryvnia. Conclusion: `?a=` carries **UAH, 1:1** with the plan
  amount. The param key is behind an obfuscated string table, so this could not be
  proven byte-for-byte statically → see **V-1** for the runtime verification gate.
- **`client-info` jar schema** — confirmed against monobank's official docs. Each
  `jars[]` item exposes `id`, `sendId`, `title`, `description`, `currencyCode`
  (`980` = UAH), `balance`, `goal`. Monetary amounts are in kopiykas (×100).

---

## Functional requirements (FR)

| ID | Status | Requirement | Notes |
| -- | ------ | ----------- | ----- |
| **FR-INPUT-01** | accepted | The plan is read from a single explicit file-path argument (`jarsplit plan.txt`). **stdin is not supported.** A missing or unreadable path is a fatal error (see FR-EXIT-01). | Deviation from brief — see [Deviations](#deviations-from-the-brief). |
| **FR-INPUT-02** | accepted | Each data line has the grammar `<amount> - <jar name>`. The line is split on its **first** `-`: the segment before it is the amount, the entire remainder is the jar name. Whitespace around the amount and around the name is trimmed. | The separator is `-`; jar names may contain `-`. |
| **FR-PARSE-01** | accepted | Blank and whitespace-only lines are skipped silently. | |
| **FR-PARSE-02** | accepted | `#` begins a comment when it is the first non-whitespace character of a line **or** when it is preceded by whitespace (inline trailing comment). A `#` adjacent to non-space text is literal, so jar names may contain `#`. Text from the comment `#` to end-of-line is stripped before parsing. | e.g. `5000 - Заощ. # note` → amount `5000`; `100 - C#фонд` → name `C#фонд`. |
| **FR-AMOUNT-01** | accepted | The amount must be a **positive whole-UAH integer** (`> 0`). Internal whitespace in the amount is stripped before parsing, so a thousands space is accepted (`12 000` → `12000`). Decimals, zero, negatives, and non-whitespace digit separators (`_`, `,`) make the line malformed. | Kopiyka precision is out of scope (BC-SCOPE-02). |
| **FR-MALFORMED-01** | accepted | A structurally malformed line (no `-`, empty name, or invalid amount) is skipped with a warning to stderr that includes the line number; remaining valid lines are still processed. The run exits non-zero. | Same philosophy as FR-RESOLVE-03 — never block everything, never guess. |
| **FR-DUP-01** | accepted | If the same jar name appears on more than one plan line, that name is skipped with a warning (with the offending line numbers) and **no link is emitted** for it. Amounts are never summed or replaced. | Ambiguous intent → never guess. |
| **FR-RESOLVE-01** | accepted | Jar names are resolved live via a single `GET /personal/client-info`. Only the `jars[]` array is considered; `accounts[]` is ignored. | See TC-API-01, FR-API-01. |
| **FR-RESOLVE-02** | accepted | A plan name matches a jar when, after trimming, it equals the jar `title` case-insensitively (Unicode-aware) as a full string. | No substring/fuzzy matching. |
| **FR-RESOLVE-03** | accepted | A plan name with zero matching jars is skipped with a warning that lists the available jar names. | Helps the user fix typos. |
| **FR-RESOLVE-04** | accepted | A plan name matching more than one eligible jar is ambiguous: skipped with a warning, no link emitted. | |
| **FR-CURRENCY-01** | accepted | Only UAH jars (`currencyCode == 980`) are eligible for matching. A plan name matching solely non-UAH jar(s) is skipped with a warning. | Prevents sending a hryvnia amount to a USD/EUR jar. |
| **FR-LINK-01** | accepted | For each matched jar, build `https://send.monobank.ua/jar/{sendId}?a={amount}`, where `{amount}` is the plan amount in UAH, 1:1, with no conversion. | **Gated by V-1** before it may move to `shipped`. |
| **FR-OUTPUT-01** | accepted | Matched jars are printed as a table (name, amount, link) to **stdout**, in the order they appear in the plan. | Deterministic ordering (NFR-DET-01). |
| **FR-OUTPUT-02** | accepted | Amounts in output are displayed with the `₴` symbol. | |
| **FR-TOTAL-01** | accepted | A `Разом` (total) line on stdout sums the amounts of **emitted links only** — i.e. money that will actually be moved. | |
| **FR-TOTAL-02** | accepted | When any jar is skipped, the planned total, the skipped total, and the skipped count are printed to **stderr**, so the discrepancy is explicit. | |
| **FR-WARN-01** | accepted | All warnings (unknown, ambiguous, duplicate, malformed, non-UAH) go to **stderr**. stdout carries only the table and total, so links can be piped cleanly. | |
| **FR-FAIL-01** | accepted | The plan is parsed and validated **before** the API call. On any fatal error, no partial or guessed output is emitted. | |
| **FR-FAIL-02** | accepted | Each fatal pre-condition prints a distinct stderr message: missing `MONO_TOKEN`; `401` invalid/expired token; `429` rate-limited (advise retry in ~60 s); network/timeout unreachable. **No auto-retry.** | One call per run; the user retries manually. |
| **FR-API-01** | accepted | Exactly **one** `client-info` call is made per run, respecting the ~1 request / 60 s endpoint limit. | |
| **FR-EXIT-01** | accepted | Exit codes: **`0`** — every plan jar matched and emitted, no warnings; **`1`** — ran and emitted ≥1 link but some jars were skipped; **`2`** — fatal: nothing resolvable (no/invalid token, `429`, network/timeout, unreadable or empty plan, **or** zero of N jars matched). | Three-tier contract for tests and scripts. |

---

## Non-functional requirements (NFR)

| ID | Status | Requirement | Notes |
| -- | ------ | ----------- | ----- |
| **NFR-DET-01** | accepted | Output is a pure deterministic function of (plan, `client-info` response): no randomness, no timestamps, stable plan-order. The same inputs always produce byte-identical output. | The live API is the only non-deterministic input; NFR-TEST-01 removes it for tests. |
| **NFR-SEC-01** | accepted | The token is read only from the `MONO_TOKEN` environment variable; it is never written to disk, config, or cache. | |
| **NFR-SEC-02** | accepted | The token is never logged, echoed, or included in any error or verbose output — not even partially. | |
| **NFR-SEC-03** | accepted | The `client-info` request is made over HTTPS only, to `api.monobank.ua`, via the `X-Token` header. | |
| **NFR-SEC-04** | accepted | Generated links contain only the jar `sendId` and amount — never the token. | |
| **NFR-NET-01** | accepted | The single HTTP call has a bounded timeout (~10 s). | |
| **NFR-TEST-01** | accepted | The full pipeline is testable offline and deterministically via a documented `client-info` fixture override (e.g. `MONO_CLIENT_INFO_FILE`). Resolution sits behind an injectable interface so tests never hit the live, rate-limited API. | Enables CI and evals; see [Verification](#verification--traceability). |

---

## Technical constraints (TC)

| ID | Status | Constraint | Notes |
| -- | ------ | ---------- | ----- |
| **TC-LANG-01** | accepted | Go 1.24.4 (per `go.mod`). | |
| **TC-DEP-01** | accepted | HTTP and JSON use the standard library (`net/http`, `encoding/json`). A vetted CLI/arg/help library (e.g. `cobra` or `urfave/cli`) is permitted for command scaffolding. No other third-party dependencies. | Minimal supply-chain surface near a banking token. |
| **TC-MODULE-01** | accepted | The Go module path stays `md/agentic/monojar`; the built binary is named **`jarsplit`** (matches the brief and all examples). | |
| **TC-API-01** | accepted | Endpoint: `GET https://api.monobank.ua/personal/client-info`, authenticated via the `X-Token: $MONO_TOKEN` header. | |
| **TC-SCHEMA-01** | accepted | Jar fields consumed from `client-info`: `title`, `sendId`, `currencyCode`. API monetary amounts (`balance`, `goal`) are in kopiykas (×100). | Verified against monobank docs. |

---

## Business / UX constraints (BC)

| ID | Status | Constraint | Notes |
| -- | ------ | ---------- | ----- |
| **BC-SCOPE-01** | accepted | Operates exclusively on the user's **own personal jars**, funded from the user's **own monobank account** — therefore no tax and no commission. It never generates links to FOP/business jars. | Defining property from the brief. |
| **BC-SCOPE-02** | accepted | **Fixed amounts only.** Percentages and "remainder" splitting are out of scope. | |
| **BC-SAFE-01** | accepted | Money is never silently misrouted. Anything that is not an unambiguous UAH-jar match (unknown, ambiguous, duplicate, non-UAH, malformed) is skipped and warned — never guessed. | The core safety property. |
| **BC-PRIVACY-01** | accepted | No analytics or telemetry. The plan and token are never persisted. | |

---

## Deviations from the brief

Decided during requirements grilling and recorded here so the brief and this PRD do
not silently disagree:

- **stdin dropped.** The brief showed `cat plan.txt | jarsplit`; the requirement
  (FR-INPUT-01) instead mandates an explicit file-path argument. Rationale: removes
  ambiguous source-precedence cases for a tighter, unambiguous CLI.
- **`--open` dropped.** The brief listed `--open` as optional; it is cut for scope.
  Links are clickable directly in the terminal.

---

## Verification & traceability

- **V-1 — runtime gate for FR-LINK-01.** Before FR-LINK-01 may be marked `shipped`,
  open one real `…?a=N` link and confirm the prefilled amount equals `N ₴` (not `N`
  kopiykas). This is the one fact that could not be proven statically.
- **Parser unit tests (table-driven)** — grammar, blank/comment handling, inline `#`,
  trimming, amount validation, malformed lines, duplicates
  (FR-INPUT-*, FR-PARSE-*, FR-AMOUNT-01, FR-MALFORMED-01, FR-DUP-01).
- **Matching/skip tests over `client-info` fixtures** — case-insensitive exact match,
  ambiguous, unknown, non-UAH filtering (FR-RESOLVE-*, FR-CURRENCY-01).
- **Golden tests** — assert the stdout table, stderr warnings, totals, and exit codes
  via the fixture override (FR-OUTPUT-*, FR-TOTAL-*, FR-WARN-01, FR-EXIT-01, NFR-TEST-01).
- **maker ≠ checker** — a separate review pass (and CodeRabbit) reviews this PRD and
  the later implementation.
- Every future spec, test, and PR references the requirement IDs above to keep
  traceability intact.

---

## Out of scope / non-goals

- Enforcing monobank's server-side min/max send bounds (server-side, undocumented,
  and liable to drift) — only the positive-integer rule (FR-AMOUNT-01) is validated;
  the send page enforces real limits at confirmation time.
- Percentage splits, multi-account funding, multi-currency funding, scheduling, and
  any persistence of state.
