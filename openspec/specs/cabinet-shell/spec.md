# cabinet-shell

## Purpose

The cabinet-shell capability provides the two top-level layouts of Kolo360: the
authenticated HR workspace (left sidebar with the Kolo360 wordmark and navigation, plus a
sticky page header carrying the screen's primary action) and the separate, sidebar-free
respondent shell at `/respond/[token]` (a single centered, mobile-first column). It also
owns the cross-cutting rule that every list and detail screen renders explicit empty,
loading, and error states and never leaves a blank area (FR-SHELL-01, FR-SHELL-02,
FR-SHELL-03). Light theme only in v1; all chrome honours the travelling accessibility,
i18n, and brand standards.

## Requirements

### Requirement: HR cabinet shell with sidebar and sticky page header

The system SHALL present every authenticated cabinet screen inside an HR workspace shell
composed of a fixed left sidebar and a content area with a sticky page header. The sidebar
SHALL show the `Kolo360` wordmark at the top, a primary navigation list with at least the
`Cycles` and `Employees` destinations, and the signed-in user surfaced at the bottom. The
content area SHALL render a sticky page header holding the screen title on the left and a
single right-aligned primary action when the screen defines one. Navigation labels and the
page title SHALL come from `lib/i18n/uk.ts` (Ukrainian-first), use sentence case, carry no
exclamation marks or emoji, use Lucide outline icons only, and present in the light theme.
Every interactive element (nav links, user control, primary action) SHALL have an
accessible name, a visible 2px accent focus ring, AA-contrast colours, and a coherent
keyboard tab order; the active navigation item SHALL be indicated by a text or state cue,
never by colour alone. The shell chrome SHALL contain oversized values gracefully: a long
screen title, long navigation label, or long signed-in user name SHALL stay within the
sticky header and fixed sidebar bounds without overflowing, overlapping the primary action,
breaking the layout, or introducing horizontal scrolling (FR-SHELL-01, NFR-A11Y-01,
NFR-A11Y-02, NFR-I18N-01, BC-BRAND-01).

#### Scenario: Cabinet screen renders sidebar, nav, and user

- **GIVEN** an authenticated HR manager
- **WHEN** any cabinet screen is loaded
- **THEN** the left sidebar shows the `Kolo360` wordmark at the top, navigation entries for
  `Cycles` and `Employees`, and the signed-in user at the bottom, with all labels drawn
  from `lib/i18n/uk.ts` in sentence case and no exclamation marks or emoji

#### Scenario: Sticky page header carries a single right-aligned primary action

- **GIVEN** a cabinet screen that defines a primary action (for example, create a cycle)
- **WHEN** the screen is rendered and the content area is scrolled
- **THEN** the page header stays pinned at the top of the content area, showing the screen
  title on the left and exactly one primary action button right-aligned

#### Scenario: Cabinet screen with no primary action omits the action slot

- **GIVEN** a cabinet screen that defines no primary action
- **WHEN** the screen is rendered
- **THEN** the sticky page header shows the title with no primary action button, and the
  layout does not leave a broken or empty action control in its place

#### Scenario: Active navigation item is indicated without relying on colour

- **GIVEN** the HR manager is on the `Employees` screen
- **WHEN** the sidebar is inspected
- **THEN** the `Employees` entry is marked active by a non-colour cue (such as an
  `aria-current` state or weight/indicator), so the active item is distinguishable without
  perceiving colour

#### Scenario: Shell chrome is keyboard navigable with visible focus

- **WHEN** the HR manager tabs through the shell with the keyboard
- **THEN** focus moves in a coherent order across the wordmark/home link, navigation
  entries, primary action, and user control, each focus stop shows a visible 2px accent
  focus ring, and each control exposes an accessible name

#### Scenario: Oversized values are contained in the header and sidebar

- **GIVEN** a cabinet screen with a long screen title (for example, 120+ characters), a
  long signed-in user name, and a long navigation label
- **WHEN** the shell renders the sticky header and fixed sidebar
- **THEN** each oversized value stays within its container bounds (truncating with an
  ellipsis or wrapping per the design system), the right-aligned primary action remains
  visible and is not overlapped or pushed off-screen, and no horizontal scrollbar appears
  on the header or sidebar

#### Scenario: Cyrillic and long locale strings render correctly in the chrome

- **GIVEN** the Ukrainian-first navigation labels, screen title, and signed-in user name
  contain Cyrillic characters (for example, `Цикли`, `Працівники`) and a long localized
  title
- **WHEN** the shell renders the sidebar and sticky header
- **THEN** every non-ASCII string renders without mojibake, question marks, or clipped
  glyphs, stays within its container per the oversized-value rule above, and is sourced
  from `lib/i18n/uk.ts` rather than hard-coded in the component

### Requirement: Separate respondent shell at /respond/[token]

The system SHALL render respondent screens at `/respond/[token]` inside a separate shell
that has no sidebar and no cabinet navigation, presenting a single centered content column
constrained to a maximum width of 640px and laid out mobile-first so it remains usable at
small viewport widths. The respondent header SHALL identify only the assessment context
(who is assessed and the assessment name) and SHALL NOT expose cabinet navigation, the HR
user control, or links into cabinet screens. Respondent strings SHALL come from
`lib/i18n/uk.ts` (Ukrainian-first), use sentence case with no exclamation marks or emoji
and Lucide outline icons only, render in the light theme, and meet the AA-contrast and
visible-focus-ring standards (FR-SHELL-02, NFR-A11Y-01, NFR-A11Y-02, NFR-I18N-01,
BC-BRAND-01).

#### Scenario: Respondent route uses the sidebar-free centered column

- **GIVEN** a request to `/respond/[token]`
- **WHEN** the respondent screen is rendered
- **THEN** the page shows no sidebar and no cabinet navigation, and the content sits in a
  single centered column whose width does not exceed 640px

#### Scenario: Respondent shell is mobile-first and usable on small screens

- **GIVEN** a respondent screen
- **WHEN** it is viewed at a narrow (mobile) viewport width
- **THEN** the single column adapts to the viewport without horizontal scrolling and, at
  narrow viewports below the 640px cap, spans the available viewport width (the 640px cap
  applies only once the viewport exceeds it)

#### Scenario: Respondent shell does not leak cabinet chrome

- **WHEN** a respondent screen is rendered
- **THEN** the header shows only the assessment context (who is assessed and the assessment
  name) and exposes no cabinet navigation links, no HR user control, and no path into
  cabinet screens

### Requirement: Explicit empty, loading, and error states on every list and detail screen

The system SHALL define explicit empty, loading, and error states for every list and detail
screen in both shells, and SHALL NOT render a blank or undefined area in place of any of
them. A loading state SHALL be shown while data is in flight; an empty state SHALL be shown
when a successful fetch returns no records, including an explanatory message and, where
applicable, the relevant call to action; an error state SHALL be shown when data fails to
load, presenting a human-readable message and a way to retry rather than a raw error,
stack, or HTTP 500. When a data fetch on an already-loaded cabinet screen returns an
authorization failure (HTTP 401 or 403) — for example, the session expired mid-session —
the system SHALL hand off to the auth flow (redirect the cabinet screen to sign-in with a
`next` parameter back to the current screen) rather than render the in-screen retry error
state, because a retry against an expired session cannot succeed; all other fetch failures
(network, 5xx, malformed payload) SHALL render the in-screen error state with the retry
affordance. All three states SHALL use Ukrainian-first strings from
`lib/i18n/uk.ts` in sentence case with no exclamation marks or emoji, meet AA contrast,
expose accessible names, and convey status with a text label (never by colour alone). This
requirement is referenced by the auth capability's sign-in screen; cabinet-shell is the
owner and the canonical definition lives here (FR-SHELL-03, NFR-A11Y-01, NFR-A11Y-02,
NFR-I18N-01, BC-BRAND-01).

#### Scenario: Loading state shown while data is in flight

- **GIVEN** any list or detail screen whose data is still loading
- **WHEN** the screen renders before the data resolves
- **THEN** it shows an explicit loading state (such as a labelled skeleton or spinner) and
  never a blank area

#### Scenario: Empty state shown when a list has no records

- **GIVEN** a list screen whose successful fetch returns zero records
- **WHEN** the screen renders
- **THEN** it shows an explicit empty state with an explanatory Ukrainian message and, where
  the screen supports creation, the relevant primary action, rather than a blank area or a
  bare empty table

#### Scenario: Error state shown when data fails to load

- **GIVEN** a list or detail screen whose data fetch fails
- **WHEN** the screen renders
- **THEN** it shows an explicit error state with a human-readable Ukrainian message and a
  retry affordance, and never surfaces a raw error, a stack trace, or an HTTP 500 page

#### Scenario: Mid-session authorization failure hands off to the auth flow

- **GIVEN** an already-loaded cabinet screen whose subsequent data fetch returns HTTP 401
  or 403 (for example, the session expired mid-session)
- **WHEN** the screen handles that authorization failure
- **THEN** it does not render the in-screen retry error state, and instead redirects to the
  sign-in screen with a `next` parameter pointing back to the current cabinet screen, so the
  HR manager re-authenticates and returns to where they were

#### Scenario: Non-authorization fetch failure renders the in-screen error state

- **GIVEN** an already-loaded cabinet screen whose data fetch fails with a non-authorization
  error (network error, HTTP 5xx, or a malformed payload)
- **WHEN** the screen handles that failure
- **THEN** it renders the in-screen error state with a human-readable Ukrainian message and
  a retry affordance, does not redirect to sign-in, and never surfaces a raw error, stack
  trace, or HTTP 500 page

#### Scenario: Localized and non-ASCII state messaging renders correctly

- **GIVEN** an empty, loading, or error state whose message contains Cyrillic, Ukrainian-first
  copy from `lib/i18n/uk.ts` (for example, a long explanatory empty-state sentence)
- **WHEN** the state is shown
- **THEN** the non-ASCII text renders without mojibake or clipped glyphs, wraps within its
  container without horizontal scrolling, and is read from `lib/i18n/uk.ts` rather than
  hard-coded

#### Scenario: State messaging is localized, accessible, and not colour-only

- **WHEN** any of the empty, loading, or error states is shown
- **THEN** its text comes from `lib/i18n/uk.ts` in sentence case with no exclamation marks
  or emoji, meets AA contrast, exposes an accessible name, and communicates the status with
  a text label rather than colour alone

## Exclusions

- Dark theme and any theme switcher are intentionally out of scope for v1; the shells are
  light theme only (tokens stay semantic).
- A runtime i18n library and a user-facing language switcher are intentionally unsupported;
  strings are sourced statically from `lib/i18n/uk.ts` with an English fallback.
- The `Templates` navigation destination is intentionally out of scope for this capability's
  MVP shell; only `Cycles` and `Employees` are required navigation entries.
- The concrete content of individual cabinet and respondent screens (cycle lists, employee
  detail, the form/chat interview) is owned by their respective capabilities; cabinet-shell
  owns only the surrounding layout chrome and the empty/loading/error contract.
- Authentication, session handling, and the sign-in screen itself are owned by the auth
  capability and are intentionally not redefined here. cabinet-shell decides only *when* a
  cabinet screen hands off to the auth flow: the unauthenticated first-load redirect and a
  mid-session 401/403 on a loaded screen both route to sign-in (with a `next` parameter),
  while the auth capability owns how sign-in authenticates and honours `next`.
