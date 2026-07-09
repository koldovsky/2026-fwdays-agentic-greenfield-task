# Gate premium upload zone

## Why

Today `features/upload-cv/ui/UploadCvDropzone.tsx` is a single component that
conflates two distinct user actions: parsing the CV for text (free, ungated,
required by FR-ONBOARD-01) and attaching the original PDF to the generation pass
for richer output (paid, gated, implemented in `add-premium-pdf-attach`). The
current disabled-button affordance for the attach action sits inside the same
dropzone that handles the free parse path, making the boundary unclear to the
reader and harder to maintain.

More importantly, the visual treatment of the premium attach action needs a
stronger signal: a disabled inline button does not communicate "this is a paid
feature" with the same clarity that a distinct, blurred zone under a semi-
transparent Premium banner does. The existing server-side gate in
`/api/tailor/generate/route.ts` is correct and sufficient as the trust boundary
(OWASP A01, NFR-SEC-04), but the client UI should reinforce the separation for
honest UX. Implements FR-CV-01, FR-ONBOARD-01, FR-PAYWALL-01, FR-PAYWALL-02,
NFR-SEC-04, BC-HONESTY-01.

## What Changes

- **Split the dropzone component.** `UploadCvDropzone` is refactored into two
  focused components: `TextUploadZone` (free, ungated, calls `/api/cv/parse`
  as today) and `PremiumAttachZone` (paid-gated, attaches the original PDF to
  the generation request). The parent `UploadCvDropzone` composes both, wiring
  them with the same props contract so call sites need no change.
- **Premium zone visual gate for free users.** For non-paid and anonymous users,
  `PremiumAttachZone` renders blurred under a semi-transparent Premium banner
  with an upgrade CTA that opens the paywall. The underlying `<input>` and all
  event handlers are disabled while the overlay is present, so there is no
  client-side path to trigger attach behavior without paid status.
- **Server-side gate is unchanged and remains the trust boundary.** The blur and
  banner are cosmetic. `/api/tailor/generate/route.ts` already sets
  `attachmentAllowed = false` and flips it to `true` only after
  `hasPaidAccess` confirms a valid subscription server-side. A user who removes
  the overlay via browser devtools and submits still gets a text-only tailoring;
  no premium behavior is unlocked (OWASP A01, NFR-SEC-04, BC-HONESTY-01).
- **Paid source is server-only.** The `paid` prop flows from
  `src/app/tailor/page.tsx` where `hasPaidAccess` is evaluated server-side
  against the subscription record. No client-derived flag is trusted.
- **i18n keys.** New `uploadCv.premiumZone.*` keys added to `types.ts`, `en.ts`,
  and `ua.ts` in `shared/lib/i18n` for the banner headline, body, and upgrade
  CTA. All keys follow Ukrainian-first convention (ua authored first, en
  mirrors). No emoji, no exclamation points, no em-dashes.
- **Design compliance.** The banner uses only existing design tokens
  (`bg-surface-canvas`, `text-ink`, `border-hairline`, `blur-sm`, `text-brand`,
  `rounded-xl`, `shadow-card`, etc.) and the existing `Button` component. No new
  hue, no icon library, no new font weight (BC-BRAND-01).

## Capabilities

### Modified Capabilities

- `upload-cv`: the component is split into `TextUploadZone` (ungated) and
  `PremiumAttachZone` (paid-gated); the premium zone renders blurred with an
  upgrade banner for non-paid users, with its input and handlers disabled.
- `paywall`: a new `PaywallReason = "attach-zone"` (or reuses existing `"attach"`)
  triggers the upgrade surface from the Premium banner CTA inside
  `PremiumAttachZone`.

## Impact

- `src/features/upload-cv/ui/`: `UploadCvDropzone.tsx` split into
  `TextUploadZone.tsx`, `PremiumAttachZone.tsx`, and a thin composer. Tests
  updated accordingly.
- `src/shared/lib/i18n/types.ts`, `en.ts`, `ua.ts`: new
  `uploadCv.premiumZone.*` keys.
- `src/features/upload-cv/index.ts`: public API barrel updated if component
  names change.
- No change to `src/app/api/tailor/generate/route.ts` (server gate is correct
  as-is) or `src/app/tailor/page.tsx` (paid prop already flows correctly).
- **NFR-PERF-04:** no new font, script, or stylesheet. The blur is a CSS
  utility; no perf regression expected.
- **NFR-A11Y-01:** the disabled overlay must not trap focus and the banner CTA
  must be keyboard-reachable with a visible focus style.

## Open question

None. The security model, component split, i18n strategy, and design constraints
are fully resolved in the interpretation above.
