# `jarsplit` — current state

Tracks the last action taken in this repo, so the next agent or human knows
what happened and what to do next. Update this after completing a unit of work.

## Last action

**2026-07-11T18:32:57+00:00** — Fixed two Android UI bugs reported against a
running build, both pure presentation issues with no FR/BC contract impact
(handled as direct fixes rather than through the OpenSpec propose/gate flow,
which this skill reserves for changes to the parsing/matching/link contract):

1. **Status bar overlap.** `targetSdk 35` forces edge-to-edge on Android 15+,
   and none of the three screens (`PlanFormScreen`, `SettingsScreen`,
   `ResultsScreen`) accounted for system-bar insets, so the top row (title +
   Settings/Back button) rendered underneath the status bar/clock. Fixed once
   at the root in `MainActivity.kt` by adding
   `Modifier.windowInsetsPadding(WindowInsets.safeDrawing)` to the top-level
   `Surface`, so every screen gets correct top padding without per-screen
   duplication; a no-op on pre-edge-to-edge devices since insets are zero
   there.
2. **Cursor position after autocomplete.** In `PlanFormScreen.kt`'s
   `PlanRowEditor`, the jar-name field used the plain-`String` `OutlinedTextField`
   overload; tapping a suggestion replaced the text but the caret stayed at
   its pre-tap offset instead of moving to the end. Switched the field to the
   `TextFieldValue` overload with a `remember(row.id)`-scoped local state, and
   explicitly set `selection = TextRange(suggestion.length)` when a suggestion
   is applied (typing still updates selection normally via the field's own
   `onValueChange`).

Verified with `./gradlew :app:testDebugUnitTest` (all existing unit tests
green — neither change touches `domain/*` business logic) and
`./gradlew :app:assembleDebug` (builds clean); no emulator/device available
in this sandbox to visually re-confirm, so a real-device check of both fixes
is still worth doing before considering this closed.

### Prior action

**2026-07-11T17:29:11+00:00** — Added an Android app as a second, independent
interface to jarsplit, spec-first via the OpenSpec change
`add-android-client` (branch `add-android-client`). The Go CLI (`cmd/`,
`internal/`) is untouched. The Android app (`android/`, Kotlin + Jetpack
Compose, single-module Gradle project under `md.agentic.jarsplit`)
reimplements the same business rules natively — no gomobile/JNI bridge:
`data/monoclient` (OkHttp + kotlinx.serialization, same 401/429/unreachable
error taxonomy as the Go client), `domain/jarmatching` (case-insensitive
UAH-only matching, BC-SAFE-01-critical), `domain/linkgen` (same `jar/`-prefix
stripping fix as `internal/linkgen`), `domain/planvalidation` (form-row
validation replacing the plan-file grammar), and `domain/run/RunUseCase`
(orchestration mirroring `run.go`'s validate→fetch→match→linkgen→classify
ordering and three-tier Complete/Partial/Fatal outcome, the UI analog of exit
codes 0/1/2). Token entry/storage moved to a Settings screen backed by
`EncryptedSharedPreferences` (Keystore-backed); plan entry moved to a
Plan Form screen with add/remove rows and session-scoped jar-name
autocomplete that is suggestion-only — every "Generate" always re-fetches
and re-matches fresh, so a stale suggestion still produces an honest warning
rather than a wrong link. Links open via an `ACTION_VIEW` Intent, never an
in-app WebView. Two decisions were resolved at the change's human gate and
recorded in `design.md` (D6): duplicate-row name detection in the Android
form is **case-insensitive** (a deliberate divergence from the CLI's
byte-exact `FR-DUP-01`, since a phone keyboard makes a case-only duplicate a
more plausible accident); and the in-app "use sample data" toggle is
**always available**, not gated to debug builds (this is a personal,
single-user app with no release-distribution risk to guard against). Synced
`docs/product-requirements.md` (new `FR-ANDROID-*`/`NFR-ANDROID-SEC-01`/
`TC-ANDROID-01`/`BC-ANDROID-01` section), `docs/product-brief.md` (one
sentence noting the two interfaces), and added non-normative cross-reference
notes to `openspec/specs/{jar-matching,link-generation,mono-client}/spec.md`
noting both interfaces independently implement those same requirements (no
requirement text changed there).

Full unit test suite was written mirroring the Go `*_test.go` coverage
(`PlanValidatorTest`, `JarMatcherTest`, `LinkGeneratorTest` incl. the
`jar/`-prefix-doubling regression, `MonoApiJarFetcherTest` via
`okhttp3.mockwebserver.MockWebServer`, `RunUseCaseTest` via a
`FixtureJarFetcher` + a `client-info-sample.json` fixture shaped like the Go
`MONO_CLIENT_INFO_FILE` fixture) — reviewed carefully by hand since this
sandbox has **no Android SDK, Gradle, or emulator installed**, so none of it
has actually been compiled or run yet. `openspec/changes/add-android-client/`
27/35 tasks are checked off (proposal/design/specs, all Kotlin source +
tests written, docs synced); the remaining 8 — `./gradlew :app:assembleDebug`
and `:app:testDebugUnitTest`, the emulator smoke run through the
matched/typo/duplicate/non-UAH scenario mix, the `adb logcat` no-token-leak
check, the Android-specific V-1 gate re-check on a real device, the
`EncryptedPrefsTokenStore` round-trip manual check, and archiving the
change — all require a machine with Android Studio/SDK and are explicitly
left unchecked in `tasks.md` rather than assumed.

### Prior action

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

**Self-check beyond manual review**: since this sandbox has no Android SDK,
downloaded the Kotlin 2.0.21 compiler and the plain-JVM dependency jars
(kotlinx-coroutines, kotlinx-serialization, OkHttp, JUnit, MockWebServer)
directly from Maven Central and actually **compiled and ran** every
Android-independent file — all of `data/monoclient`, `domain/jarmatching`,
`domain/linkgen`, `domain/planvalidation`, `domain/run`, and their five test
classes. All 31 tests passed (`JarMatcherTest` 6, `LinkGeneratorTest` 5,
`PlanValidatorTest` 7, `RunUseCaseTest` 8, `MonoApiJarFetcherTest` 5 — the
last two via real coroutines and a real `MockWebServer`). This is the
BC-SAFE-01-critical money-routing logic, so it being real, executed,
passing tests (not just hand-reviewed) matters more than the UI layer.
For the Android-only files that need `androidx.*`/`android.*` (no android.jar
available here to actually compile them), downloaded the real compiled
`.aar`s from Google's Maven repo and used `javap` to check the exact
bytecode signatures of every higher-risk hand-typed call site against what
was written: `EncryptedSharedPreferences.create(...)` and
`MasterKey.Builder(...).setKeyScheme(...)` (security/EncryptedPrefsTokenStore.kt),
`ViewModelProvider.Factory.create(Class<T>)` (still a valid default method
to override in lifecycle 2.8.6), `androidx.activity.viewModels(...)` (confirmed
it's a top-level extension in the base `activity` artifact, not the
now-empty `activity-ktx` shim — the explicit `activity-ktx` dependency is
harmless but redundant), `HorizontalDivider` (confirmed present in material3
1.3.1 — this was already caught and fixed during writing, this just
double-confirms it), `NavHost`/`composable` (navigation-compose 2.8.2),
`collectAsState` (compose-runtime, via its `SnapshotStateKt` facade),
`PasswordVisualTransformation` (ui-text), and `OutlinedTextField`'s
`isError`/`supportingText`/`singleLine`/`keyboardOptions` parameters
(material3 1.3.1) — every one matched exactly. What's still **not**
verified because it requires a real Android Gradle Plugin build (SDK,
`android.jar`, resource merging, actual Compose UI rendering): the full
`android/app` module actually assembling and running, which is exactly
tasks 1.4 and 8.1-8.4 in `tasks.md`, left unchecked.

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

**Android app** (`add-android-client`, current top priority): open
`android/` in Android Studio and run the 8 remaining unchecked items in
`openspec/changes/add-android-client/tasks.md` §8-9 — none of this Kotlin
code has been compiled or executed yet, only hand-reviewed. In order:
`./gradlew :app:assembleDebug` and `:app:testDebugUnitTest` first (fix
anything the compiler catches that manual review didn't); then the emulator
smoke run through a matched/typo/duplicate/non-UAH row mix; an `adb logcat`
grep across that run confirming no token substring ever appears; the
`EncryptedPrefsTokenStore` round-trip manual check; and, on a **real
device** with a real token, tapping a generated link to re-confirm the
Android-specific V-1 gate (prefilled amount is `N ₴`, not kopiykas — this
is a separate `buildUrl`-equivalent from the CLI's, so it needs its own
confirmation). Only archive the change once those pass.

The CLI's own **V-1** manual verification gate on `FR-LINK-01` is now *partially*
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
