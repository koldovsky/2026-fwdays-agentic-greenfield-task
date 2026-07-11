## ADDED Requirements

### Requirement: Form-based plan entry (FR-ANDROID-INPUT-01)
The Android app SHALL accept the jar-split plan as rows entered in a form UI
(jar name + amount per row, added/removed by the user), not as a file path or
stdin. No text-grammar file is read or written by the app.

#### Scenario: User builds a plan from form rows
- **WHEN** the user adds three rows on the Plan Form screen, each with a name
  and an amount, and taps "Generate"
- **THEN** the app treats those three rows as the plan for that run, with no
  file involved

### Requirement: Row-scoped plan validation (FR-ANDROID-INPUT-02)
Each form row SHALL be validated independently: the amount MUST be a positive
whole UAH integer (internal whitespace tolerated as a thousands separator,
per the same rule as `FR-AMOUNT-01`); the name MUST be non-empty after
trimming. A row that fails validation SHALL show its error inline on that row
(not as a line-numbered message) and SHALL be excluded from matching. Two or
more rows whose trimmed names are equal **case-insensitively** (Unicode-aware
— the same comparison jar matching uses for titles) SHALL all be flagged as
duplicates and excluded from matching; amounts are never summed or merged
across duplicate rows. This is a deliberate divergence from the CLI's
`FR-DUP-01`, which compares byte-exact: on a phone keyboard, a case-only
difference is a more plausible accidental duplicate, and since jar matching
would already treat the two names as the same jar, letting them stand as
distinct rows would risk two different amounts silently targeting one jar.

#### Scenario: Invalid amount is rejected per-row
- **WHEN** a row has amount text `-5` or `12.50` or empty
- **THEN** that row shows an inline "invalid amount" error and is excluded
  from the plan sent to matching, while other valid rows are unaffected

#### Scenario: Duplicate row names are both flagged
- **WHEN** two rows both have the trimmed name `Заощадження`
- **THEN** both rows show a "duplicate name" indicator and neither is
  included in matching or link generation

#### Scenario: Case-only duplicate is flagged, not treated as distinct
- **WHEN** one row has the trimmed name `Заощадження` and another has
  `заощадження`
- **THEN** both rows show a "duplicate name" indicator and neither is
  included in matching or link generation, even though the strings are not
  byte-identical

#### Scenario: Thousands-separator whitespace is tolerated
- **WHEN** a row's amount text is `12 000`
- **THEN** it is parsed as the integer `12000` and treated as valid

### Requirement: In-app token entry and storage (FR-ANDROID-TOKEN-01)
The app SHALL provide a Settings screen where the user enters their monobank
personal token. The input SHALL be masked. Once saved, the app SHALL show
only a "token set" / "not set" status — never the token value itself, even
partially.

#### Scenario: Token round-trips across app restarts
- **WHEN** the user enters a token on the Settings screen and taps Save, then
  closes and reopens the app
- **THEN** the Settings screen shows "token set" without ever redisplaying
  the token value

#### Scenario: Missing token blocks a run with a clear message
- **WHEN** the user taps "Generate" with no token saved
- **THEN** the app shows a fatal, distinct message indicating the token is
  not set, makes no network call, and does not proceed to fetch or match

### Requirement: Session jar cache is suggestion-only (FR-ANDROID-CACHE-01)
The app SHALL treat any session-scoped jar cache (optionally fetched once per
session, on first entering the Plan Form or on an explicit refresh, to
populate a name-autocomplete list) as suggestion-only. Every "Generate"
action SHALL perform its own fresh jar fetch and match rows against that
fresh result — the cached list SHALL NOT be substituted for a fresh
fetch-and-match at Generate time, regardless of whether the cache looks
current.

#### Scenario: Autocomplete suggests, never decides
- **WHEN** the user picks a suggested jar name from the autocomplete list and
  taps "Generate"
- **THEN** the app performs a new jar fetch and matches the picked name
  against that fresh result, exactly as it would for a freely typed name

#### Scenario: A renamed jar since the last cache fetch still produces an honest warning
- **WHEN** the cached suggestion list contains a jar title that has since
  been renamed on the live account, and the user submits a plan row using the
  now-stale cached title
- **THEN** the fresh fetch-and-match at Generate time does not find that
  title among the live jars, and the row is skipped with an "unknown jar"
  warning — the app never emits a link based on the stale cached name alone

### Requirement: Links open via external Intent, never in-app WebView (FR-ANDROID-LINK-01)
Each generated link SHALL be opened by firing an `ACTION_VIEW` Intent to the
user's default browser or the monobank app. The app SHALL NOT render
`send.monobank.ua` in an in-app WebView.

#### Scenario: Tapping a link hands off to an external app
- **WHEN** the user taps "Open" on a generated link row
- **THEN** the device's default handler for `https://send.monobank.ua/...`
  (browser or the monobank app) opens the URL, and no WebView is shown inside
  jarsplit

### Requirement: Complete/Partial/Fatal outcome presentation (FR-ANDROID-RESULT-01)
After a "Generate" action, the Results screen SHALL present exactly one of
three outcomes, mirroring the CLI's exit-code contract (`FR-EXIT-01`):
Complete (every plan row matched and emitted, zero warnings), Partial (at
least one link emitted but some rows were skipped), or Fatal (nothing
resolvable — no valid rows, or a token/network/rate-limit error, or zero of N
rows matched). The links table and total SHALL always reflect only emitted
links; warnings SHALL always be listed separately from the table.

#### Scenario: Partial outcome shows both emitted links and skip warnings
- **WHEN** two of three plan rows match live UAH jars and one row's name
  matches no jar
- **THEN** the Results screen shows a "Partial" banner, a table with the two
  matched links and their total, and a separate warning for the unmatched row
  naming it and listing the available jar titles

#### Scenario: Fatal outcome from an unreachable API shows no partial table
- **WHEN** the jar fetch fails because the device has no network connectivity
- **THEN** the Results screen shows a "Fatal" banner with a distinct
  "unreachable" message and no links table is rendered

### Requirement: Token handling matches the CLI's security posture (NFR-ANDROID-SEC-01)
The token SHALL be stored only via Android Keystore-backed encrypted storage
(e.g. `EncryptedSharedPreferences`), never in plaintext, never written to any
log, crash report, or analytics event (the app has no analytics, per
`BC-PRIVACY-01`). No error message, debug output, or UI state SHALL include
the token value, even truncated.

#### Scenario: No log output contains the token
- **WHEN** the app performs a live jar fetch, including one that fails with
  401 or 429
- **THEN** no log line, exception message, or UI text produced during that
  run contains the token value

### Requirement: Money-routing safety holds on Android (BC-ANDROID-01)
The Android app SHALL uphold `BC-SAFE-01` end to end: a link is only ever
generated for a plan row that unambiguously matches exactly one live UAH jar
by exact case-insensitive title; anything else (unknown, ambiguous, non-UAH,
duplicate, or invalid row) is skipped and surfaced as a warning, never
guessed — regardless of autocomplete suggestions, cached data, or UI
convenience features.

#### Scenario: Ambiguous match is skipped, not guessed
- **WHEN** a plan row's name case-insensitively matches the titles of two
  distinct live UAH jars
- **THEN** no link is generated for that row, and it is surfaced as an
  "ambiguous" warning
