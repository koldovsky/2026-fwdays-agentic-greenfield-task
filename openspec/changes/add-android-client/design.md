## Context

`jarsplit` today is a Go CLI (`cmd/jarsplit`, `internal/{planparsing,jarmatching,linkgen,monoclient,outputreport}`),
zero third-party dependencies, spec-driven via `docs/product-requirements.md`
and `openspec/specs/`. This change adds a second, independent interface — an
Android app — without touching the Go module. The user has already decided
(recorded in the approved plan, `/Users/maksim/.claude/plans/spec-driven-change-let-s-change-interac-ticklish-scott.md`):
the CLI stays as-is; the Android app reimplements the core logic natively in
Kotlin (no gomobile/JNI); token and plan input move to an in-app Settings
screen and a form UI. This document covers the technical decisions needed to
execute that direction.

## Goals / Non-Goals

**Goals:**
- Ship a small, single-module Android app that performs the same job as the
  CLI — resolve a plan of jar names + amounts into `send.monobank.ua` links —
  from a phone, with a friendlier input surface (form instead of text file,
  Settings instead of env var).
- Preserve every safety-relevant behavior of the CLI: exact UAH-jar matching,
  never guessing on unknown/ambiguous/non-UAH names, one client-info call per
  action, distinct error messages, no token leakage.
- Keep the app small enough for a solo hobbyist to build and maintain: minimal
  dependencies, no DI framework, no multi-module split, no instrumented-test
  infrastructure beyond what's strictly necessary.

**Non-Goals:**
- No code sharing between the Go CLI and the Android app (explicit user
  decision — this is two independent implementations of the same contract,
  not one core with two front-ends).
- No background sync, no push notifications, no multi-account support, no
  persistence of the plan across sessions (mirrors `BC-SCOPE-01`/`BC-SCOPE-02`
  and `BC-PRIVACY-01` — plan and token are never persisted beyond the token
  itself, which the user explicitly asks to be remembered via Settings).
- No changes to the CLI's exit codes, stdout/stderr contract, or plan-file
  grammar.

## Decisions

### D1 — Native Kotlin reimplementation, no gomobile/JNI bridge
**Decision:** Port `jarmatching`, `linkgen`, `monoclient`, and the validation
half of `planparsing` to idiomatic Kotlin (data classes / sealed classes),
independently tested.
**Alternatives considered:** `gomobile bind` to compile the existing Go
packages into an `.aar` and call them from Kotlin. Rejected — it adds a
Go-toolchain-on-Android build step, a JNI boundary to debug, and CGO/gomobile
version-compatibility risk, for a project whose Go logic is small enough
(five files, ~a few hundred lines total) that re-expressing it in Kotlin is
cheaper than maintaining a cross-language bridge. This was the user's explicit
choice; recorded here for the "why," not to re-litigate it.

### D2 — Networking: OkHttp + kotlinx.serialization
**Decision:** `com.squareup.okhttp3:okhttp:4.12.0` +
`org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3`.
**Alternatives considered:**
- Retrofit — its value is annotation-driven multi-endpoint definitions with
  generated adapters; this app calls exactly one endpoint
  (`GET /personal/client-info`), so Retrofit adds a dependency and a
  code-generation layer for no benefit over calling OkHttp directly.
- Raw `HttpURLConnection` (the closest analog to Go's stdlib-only stance) —
  rejected because, unlike Go's `net/http`, Android's `HttpURLConnection` has
  well-documented footguns (keep-alive/connection-reuse bugs on older API
  levels, awkward timeout/cancellation wiring) that would mean hand-rolling
  error-prone plumbing. A single, extremely widely-vetted dependency is a
  better trade than reinventing it, and still keeps the total dependency
  count minimal — in the spirit of `TC-DEP-01` even though its literal
  wording is Go-specific.
- Gson/Moshi for JSON — kotlinx.serialization avoids reflection, is the
  official JetBrains library, and integrates cleanly with Kotlin
  `data class`/`sealed class` DTOs without annotation-processor setup.

### D3 — Token storage: EncryptedSharedPreferences (Jetpack Security)
**Decision:** `androidx.security:security-crypto:1.1.0-alpha06`,
`EncryptedSharedPreferences` backed by an `AndroidKeyStore` AES256-GCM master
key.
**Alternatives considered:**
- Plaintext `SharedPreferences` — rejected outright, violates the intent of
  `NFR-SEC-01`/`NFR-SEC-02` (token never persisted unprotected).
- Hand-rolled `AndroidKeyStore` + `Cipher` wrapping ciphertext into plain
  `SharedPreferences`/DataStore — strictly more code for the same guarantee.
  Documented here as the fallback if `security-crypto`'s long-standing alpha
  version ever becomes a real blocker (e.g. breaks under a future AGP/Compose
  bump); not built now because the risk hasn't materialized and the library
  is what most comparable small apps use in practice.

### D4 — Single-module Gradle, no DI framework
**Decision:** One Gradle module (`:app`). Dependency wiring via a small manual
`AppContainer` constructed in the `Application` subclass (three or four
objects: `TokenStore`, `JarFetcher`, `RunUseCase`).
**Alternatives considered:** Hilt/Dagger — rejected at this scale; the object
graph is small enough that a DI framework's boilerplate and build-time cost
outweigh its benefit. Multi-module split (e.g. separating `domain`/`data`/`ui`
into Gradle modules) — rejected for the same reason; package-level separation
inside one module gives the same readability without extra build
configuration to maintain.

### D5 — Session jar cache is suggestion-only; every Generate re-fetches and re-matches
**Decision:** The Plan Form fetches jars once (on first entry, or on-demand
refresh) to populate a name-autocomplete list. The "Generate" action always
performs its own fresh `fetchJars()` call and matches against that fresh
result — never against the cached suggestion list.
**Alternatives considered:** Match against the cached list directly at
Generate time (skip the extra fetch). **Rejected** — this is the one place a
later "optimization" could quietly reintroduce guessing: if a jar was renamed
or deleted since the cache was populated, matching against stale data could
either wrongly emit a link (if renamed to something that still string-matches
some now-different jar) or wrongly warn on a jar that's actually fine. A fresh
fetch-then-match at the moment of action keeps `BC-SAFE-01`'s guarantee intact
exactly as the CLI has it (one fetch, immediately followed by matching, per
run). The extra latency (one more network round trip) is an acceptable cost
for a manual, infrequent action.

### D6 — Duplicate-name detection is case-insensitive, a deliberate divergence from the Go CLI
**Decision (resolved at the human gate):** Two form rows are "duplicate
names" if their trimmed names are equal **case-insensitively** (Unicode-aware
— the same comparison `JarMatcher` already uses for title matching), not
byte-identical. This diverges from `internal/planparsing.dropDuplicates`'s
exact-string rule on the Go side.
**Rationale:** a phone keyboard (autocapitalization, autocomplete-picked
suggestions re-typed by hand, etc.) makes a case-only accidental duplicate —
"Заощадження" vs "заощадження" — meaningfully more likely than it was in a
hand-edited CLI text file. Since jar *matching* already treats those two
strings as the same jar, flagging them as non-duplicate rows would let two
rows both silently resolve to the same jar with two different amounts, which
is a worse outcome than an over-eager duplicate warning. This is a deliberate
product decision, not an oversight — record it in
`docs/product-requirements.md`'s `FR-ANDROID-INPUT-02` so it doesn't read as
an accidental inconsistency with the CLI's `FR-DUP-01`.

## Risks / Trade-offs

- **[Risk]** `androidx.security:security-crypto` has stayed in alpha for a
  long time. → **Mitigation**: documented fallback in D3; re-evaluate only if
  it actually breaks under a future toolchain bump, not preemptively.
- **[Risk]** Two independent implementations of the same business rules
  (Go and Kotlin) can drift silently — a bug fixed in one might not be
  ported to the other (e.g. the `jar/`-prefix-doubling fix `internal/linkgen`
  already has). → **Mitigation**: the Kotlin port copies that fix at
  implementation time (tracked in `tasks.md`); going forward, both specs
  cite the same PRD requirement IDs so a future behavior change is easier to
  notice needs mirroring, even without shared code.
- **[Risk]** An extra fetch-before-match round trip (D5) adds latency to
  every "Generate" tap and consumes one call against the ~1 req/60s rate
  limit each time. → **Mitigation**: this matches the CLI's own one-call-
  per-run behavior exactly; the UI debounces double-taps so a single user
  action never issues more than one call.
- **[Risk]** `EncryptedSharedPreferences` requires `minSdk 23+` for
  Keystore-backed AES-GCM to work reliably; setting `minSdk 26` (see
  `tasks.md`) narrows device support versus the CLI's platform-agnostic
  nature. → **Mitigation**: acceptable for a solo/hobby app targeting a
  personal device; not a general-audience release.

## Open Questions

_None outstanding — both were resolved at the human gate:_
- D6 (duplicate-row case-sensitivity): case-insensitive, see D6 above.
- The "use sample data" toggle is **not** `BuildConfig.DEBUG`-gated: it ships
  as a normal, always-available in-app Settings switch in every build type.
  This is a personal, single-user app with no third-party distribution risk,
  so there's no accidental-release concern to guard against; gating it would
  only make it harder for the one user to exercise the fixture path when they
  want to (e.g. to sanity-check the app while traveling without touching the
  real rate-limited API). Rename the concept from "debug toggle" to "sample
  data toggle" throughout to reflect this.
