## 1. Gradle project scaffold

- [x] 1.1 Create `android/` as a new Gradle project (sibling to `cmd/` and
      `internal/`): `settings.gradle.kts`, root `build.gradle.kts` (plugin
      versions only), `gradle.properties`, Gradle wrapper.
- [x] 1.2 Create the `:app` module (`android/app/build.gradle.kts`): AGP
      8.6.1, Kotlin 2.0.21 with the Compose compiler plugin, `applicationId`/
      root package `md.agentic.jarsplit`, `minSdk 26`, `compileSdk`/
      `targetSdk 35`.
- [x] 1.3 Add dependencies: OkHttp 4.12.0, kotlinx-serialization-json 1.7.3
      (+ `kotlin("plugin.serialization")`), `androidx.navigation:navigation-compose:2.8.2`,
      `androidx.lifecycle:lifecycle-viewmodel-compose:2.8.6`,
      `androidx.security:security-crypto:1.1.0-alpha06`; test deps:
      `com.squareup.okhttp3:mockwebserver:4.12.0`, JUnit.
- [ ] 1.4 Confirm `./gradlew :app:assembleDebug` succeeds with an empty
      `MainActivity` before adding feature code. **Not runnable in the
      sandbox this was authored in (no Android SDK/Gradle installed) — run
      on a machine with Android Studio.**

## 2. Domain layer: monoclient

- [x] 2.1 `data/monoclient/Jar.kt` — `data class Jar(title, sendId, currencyCode)`.
- [x] 2.2 `data/monoclient/MonoClientException.kt` — sealed class with
      `MissingToken`, `InvalidToken`, `RateLimited`, `Unreachable(cause)`.
- [x] 2.3 `data/monoclient/JarFetcher.kt` — interface `fetchJars(): List<Jar>`
      (suspend).
- [x] 2.4 `data/monoclient/MonoApiJarFetcher.kt` — OkHttp GET to
      `https://api.monobank.ua/personal/client-info` with `X-Token` header
      from `TokenStore`; `callTimeout(10s)`; status mapping 200→decode,
      401→InvalidToken, 429→RateLimited, other/IOException→Unreachable; only
      `jars[].title/sendId/currencyCode` consumed.
- [x] 2.5 `data/monoclient/FixtureJarFetcher.kt` — returns a fixed
      `List<Jar>`, used by tests and the always-available "sample data" toggle.
- [x] 2.6 `MonoApiJarFetcherTest.kt` using `MockWebServer`: success, 401, 429,
      malformed JSON, unreachable/timeout; assert exactly one request issued
      per call; assert no exception message contains the token value.

## 3. Domain layer: matching, link generation, validation

- [x] 3.1 `domain/jarmatching/Matched.kt`, `MatchWarning.kt` (sealed:
      Unknown/NonUAH/Ambiguous), `JarMatcher.kt` — case-insensitive exact
      title match (`String.equals(ignoreCase = true)`), UAH-only
      (`currencyCode == 980`) eligibility, per FR-RESOLVE-01..04 and
      FR-CURRENCY-01.
- [x] 3.2 `JarMatcherTest.kt` — case-insensitive match, unknown (with
      available-titles list), non-UAH filtering, ambiguous, plan-order
      preservation.
- [x] 3.3 `domain/linkgen/Link.kt`, `LinkGenerator.kt` — build
      `https://send.monobank.ua/jar/{sendId}?a={amount}`, stripping a
      leading `jar/` prefix off `sendId` before rejoining (the same fix
      `internal/linkgen.buildURL` has for the real API's prefixed `sendId`).
- [x] 3.4 `LinkGeneratorTest.kt` — exact URL shape, the `jar/`-prefix-doubling
      regression (name the test after this history), amount not scaled, no
      token/extra-param leakage.
- [x] 3.5 `domain/planvalidation/PlanRow.kt`, `PlanEntry.kt`,
      `PlanValidationWarning.kt` (sealed: EmptyName/InvalidAmount/DuplicateName
      keyed by row id), `PlanValidator.kt` — positive whole-UAH amount
      tolerant of internal whitespace as thousands separator, non-empty name,
      duplicate detection by **case-insensitive** (Unicode-aware) equality on
      trimmed name — a deliberate divergence from the Go CLI's exact-match
      rule, resolved at the human gate (design.md D6).
- [x] 3.6 `PlanValidatorTest.kt` — valid row, invalid amount (negative/zero/
      decimal/non-numeric), thousands-space tolerance, empty name, duplicate
      names (byte-identical), case-only duplicate names (e.g. `Заощадження`
      vs `заощадження`).

## 4. Domain layer: orchestration

- [x] 4.1 `domain/run/RunOutcome.kt` — sealed `Complete/Partial/Fatal` +
      `FatalReason` (MissingToken/InvalidToken/RateLimited/Unreachable/
      NoValidEntries/NothingMatched) + `RunResult` (links, total, warnings,
      skippedTotal, skippedCount).
- [x] 4.2 `domain/run/RunUseCase.kt` — `run(rows: List<PlanRow>): RunOutcome`:
      validate rows → if zero valid entries, return `Fatal(NoValidEntries)`
      before any network call → fetch jars (map fetch exceptions to the
      matching `FatalReason`) → match → generate links → classify into
      Complete/Partial/Fatal(NothingMatched), mirroring `run.go`'s ordering
      and `exitCode()` three-tier logic.
- [x] 4.3 `RunUseCaseTest.kt` — using `FixtureJarFetcher` +
      `src/test/resources/fixtures/client-info-sample.json` (same JSON shape
      as the Go `MONO_CLIENT_INFO_FILE` fixture): all-matched, mixed
      matched/skipped, zero-matched, zero-valid-rows, each fetch-error
      `FatalReason`.

## 5. Security

- [x] 5.1 `security/TokenStore.kt` — interface `get()/set(token)/clear()`.
- [x] 5.2 `security/EncryptedPrefsTokenStore.kt` — `EncryptedSharedPreferences`
      backed by an `AndroidKeyStore` AES256-GCM `MasterKey`.
- [ ] 5.3 Manual check (not an automated test, per design.md): round-trip a
      token through `EncryptedPrefsTokenStore` on a real device/emulator,
      since `AndroidKeyStore` isn't available to local JVM unit tests.

## 6. UI

- [x] 6.1 `JarsplitApp.kt` (Application subclass + manual `AppContainer`:
      `TokenStore`, `JarFetcher`, `RunUseCase`), `MainActivity.kt`
      (single-Activity, Compose, `navigation-compose` NavHost).
- [x] 6.2 `ui/settings/SettingsScreen.kt` + ViewModel — masked token field
      (`PasswordVisualTransformation`), Save/Clear, "token set/not set"
      status, an always-available "use sample data" toggle (all build types,
      not `BuildConfig.DEBUG`-gated) wired to `FixtureJarFetcher`.
- [x] 6.3 `ui/planform/PlanFormScreen.kt` + ViewModel — `LazyColumn` of rows
      with inline validation errors, add/remove row, session jar-fetch for
      autocomplete (suggestion-only, per FR-ANDROID-CACHE-01/design.md D5),
      "Generate" button (debounced against double-taps) navigating to
      Results.
- [x] 6.4 `ui/results/ResultsScreen.kt` + ViewModel — Complete/Partial/Fatal
      banner, links table with "Разом" total, warnings list, "Open" button
      per link firing `Intent(ACTION_VIEW, Uri.parse(url))`.

## 7. Docs sync

- [x] 7.1 Add to `docs/product-requirements.md`: `FR-ANDROID-INPUT-01/02`,
      `FR-ANDROID-TOKEN-01`, `FR-ANDROID-CACHE-01`, `FR-ANDROID-LINK-01`,
      `FR-ANDROID-RESULT-01`, `NFR-ANDROID-SEC-01`, `TC-ANDROID-01`,
      `BC-ANDROID-01`, matching the requirements in
      `specs/android-client/spec.md`.
- [x] 7.2 Add one sentence to `docs/product-brief.md` noting jarsplit ships
      as both a CLI and an Android app.
- [x] 7.3 Add a short, non-normative cross-reference note to the Purpose
      section of `openspec/specs/jar-matching/spec.md`,
      `openspec/specs/link-generation/spec.md`, and
      `openspec/specs/mono-client/spec.md`, noting both the CLI and the
      Android app independently implement these Requirement/Scenario
      contracts (no requirement text changes).

## 8. Verify

- [ ] 8.1 `./gradlew :app:testDebugUnitTest` green. **Not runnable in the
      sandbox this was authored in (no Android SDK/Gradle) — run on a
      machine with Android Studio/JDK+Gradle available.**
- [ ] 8.2 Emulator smoke run: Settings → enable sample data → Plan Form with
      a matched/typo/duplicate/non-UAH row mix (mirroring
      `sample-input.txt`'s scenarios) → Results shows correct
      Complete/Partial/Fatal banner, total, and warnings.
- [ ] 8.3 `adb logcat` grep confirms no token substring appears during a live
      token-entry + fetch flow.
- [ ] 8.4 Real-device check with a real token and real jar: tap "Open" on a
      generated link and confirm the `send.monobank.ua` page/monobank app
      prefills the amount as `N ₴`, not kopiykas (Android-specific V-1 gate
      re-check, independent of the CLI's).
- [ ] 8.5 Append a dated entry to `docs/current-state.md` (ISO-8601 timestamp)
      summarizing what was built and verified, and any open follow-ups.

## 9. Archive

- [ ] 9.1 Run `openspec-archive-change` to sync `specs/android-client/` into
      live `openspec/specs/`. **Deferred until 8.1-8.4 are actually verified
      — archiving before real verification would mark this shipped
      prematurely.**
