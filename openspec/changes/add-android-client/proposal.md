## Why

`jarsplit` is a Go CLI that turns a monthly monobank jar-split plan into ready-to-tap
send links. Interacting with it currently requires a terminal, a hand-edited plan
file, and an `MONO_TOKEN` env var — fine for the author, but the tool would be far
more convenient to use from a phone at the moment the money actually needs moving.
This change adds an Android app as a second, independent interface, so the same
jar-split workflow is available from a form-based UI instead of a terminal session.

## What Changes

- Add a new Android app (`android/`, single-module Gradle project, Kotlin +
  Jetpack Compose) that reimplements jarsplit's core logic **natively in Kotlin**
  — no gomobile/JNI bridge to the existing Go code. The CLI (`cmd/`, `internal/`)
  is untouched; both interfaces coexist and must independently satisfy the same
  behavioral contracts.
- Replace the CLI's env-var token and text-file plan **for this interface only**
  with an in-app Settings screen (masked token entry, Keystore-backed
  `EncryptedSharedPreferences` storage) and a Plan Form screen (add/remove
  name+amount rows with inline per-row validation, replacing the
  `<amount> - <name>` text grammar entirely — the grammar's *validation
  semantics*, not its syntax, carry over).
- Add session-scoped jar-name autocomplete in the Plan Form, fetched once per
  session for suggestions only. Every "Generate" action re-fetches jars and
  re-matches from scratch — the cache never substitutes for a fresh match, so
  `BC-SAFE-01` (never silently misroute money) holds identically to the CLI.
  Fixture/fake data support (`FixtureJarFetcher`) doubles as an always-available
  in-app "sample data" toggle for exercising the app without a real token —
  not gated to debug builds, since this is a personal, single-user app with
  no third-party distribution risk to guard against.
- Add a Results screen with a Complete/Partial/Fatal status banner (the UI
  analog of the CLI's exit codes 0/1/2), a links table with a total, and a
  warnings list. Links open via an `ACTION_VIEW` Intent to the user's browser
  or the monobank app — never an in-app WebView — so the amount-prefill
  behavior (`V-1`) can be verified against the real external page.
- Networking via OkHttp + kotlinx.serialization (one endpoint; Retrofit's
  machinery isn't warranted, and Android's raw `HttpURLConnection` isn't a
  good analog for Go's stdlib-only posture). Same error taxonomy as the CLI:
  missing/invalid token, rate-limited (429, no auto-retry), unreachable —
  each surfaced as a distinct message.

## Capabilities

### New Capabilities

- `android-client`: the Android app's interaction surface — form-based plan
  entry and its validation rules, token entry/storage, jar-fetch caching and
  autocomplete semantics (and the guarantee that a fresh match always gates
  link generation regardless of cache state), link-opening via Intent, and the
  Complete/Partial/Fatal outcome presentation.

### Modified Capabilities

_None._ `jar-matching`, `link-generation`, and `mono-client` describe business
rules the Android app must also satisfy, but this change does not alter any of
their existing Requirement/Scenario text — the Android implementation is a new,
independent consumer of the same contract, not a change to it. (A short,
non-normative cross-reference note will be added to each of those specs'
Purpose sections directly, outside the delta-spec mechanism, since no
requirement text changes — see `tasks.md`.) `plan-parsing`, `output-reporting`,
and `cli-orchestration` are untouched: they describe the CLI's text grammar,
stdout/stderr, and exit-code mechanics specifically, which the Android app does
not implement.

## Impact

- **New code**: `android/` — a new Gradle project, sibling to `cmd/` and
  `internal/`. No existing Go file changes.
- **New dependencies** (Android-side only, not in `go.mod`): OkHttp,
  kotlinx.serialization, `androidx.security:security-crypto`,
  `androidx.navigation:navigation-compose`, `androidx.lifecycle:lifecycle-viewmodel-compose`.
- **Docs**: `docs/product-requirements.md` gains new `FR-ANDROID-*`,
  `NFR-ANDROID-*`, `TC-ANDROID-01`, `BC-ANDROID-01` IDs; `docs/product-brief.md`
  gains one sentence noting the two interfaces; `docs/current-state.md` gets a
  dated log entry once implemented and verified.
- **No changes** to `cmd/jarsplit`, `internal/*`, or any existing test in the
  Go module.
