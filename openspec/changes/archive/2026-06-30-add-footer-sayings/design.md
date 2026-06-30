## Context

- Baseline spec: `openspec/specs/footer-sayings/spec.md` (FR-SAYINGS-01, Future-phase).
- `AppFooter.tsx` currently renders only the static NBU provenance line; it
  has no date input and is not a client component itself.
- `RatesView` (`"use client"`) renders `<AppShell>` → `<AppFooter>` directly —
  in Next's App Router, a component reached through a Client Component's own
  render tree is bundled and executed on the client even without its own
  `"use client"` directive. So `AppFooter` is **not** a safe place to call
  `new Date()` directly: the server-rendered HTML and the client's hydration
  pass could disagree on the calendar day at a midnight boundary, producing
  exactly the class of hydration mismatch `isStaleRate` was already designed
  to avoid (`currency-list` design.md).

## Goals / Non-Goals

**Goals:**

- A calm, dry, deterministic Ukrainian money saying in the footer.
- No API call, no tracking, no new NBU dependency — pure local selection.
- Same saying for repeat visits on the same calendar day (Kyiv).
- No hydration-mismatch risk.

**Non-Goals:**

- No saying rotation faster than daily, no user control over which saying shows.
- No `en.ts` fallback content (consistent with the rest of the app — Future).
- No persistence of "which sayings have been shown" — pure modulo selection,
  intentionally simple.

## Decisions

### 1. Compute the saying once, server-side, thread as a prop

Mirrors `currency-list`'s `isStaleRate` precedent exactly:

```
app/page.tsx (Server Component, new Date() called once)
  -> RatesView (client) — new `saying: string` prop
    -> AppShell — new `footerSaying?: string` prop
      -> AppFooter — renders it
```

Both of `RatesView`'s render branches (the `!result.ok` error path and the
success path) pass `footerSaying={saying}` to `<AppShell>` — the footer
saying is independent of whether the rates loaded, so it must appear in both.

### 2. Sayings live in `lib/sayings/`, not `lib/i18n/uk.ts`

`uk.ts` centralises short, single-purpose UI control strings and templates
(labels, error messages, sentence templates). A 12-entry rotating content
corpus is a different kind of artifact — closer to `lib/jokes/`-style content
modules in spirit — so it gets its own small pure module,
`lib/sayings/sayings.ts`, kept separate from the UI-string table for clarity.
`FR-I18N-01`'s "no inline literals in components" is still satisfied: the
sayings live in `lib/`, not inline in `AppFooter.tsx`.

### 3. `kyivDayOfYear` extends `kyivDate.ts`, doesn't duplicate it

```ts
// lib/nbu/kyivDate.ts — extended
export function kyivDayOfYear(date: Date): number;
  // 1-366, using the same Kyiv-timezone `kyivParts` extraction already
  // shared by kyivDateString/kyivYmd/addKyivDays.

// lib/sayings/selectSaying.ts — pure, total
export function selectSaying(sayings: readonly string[], date: Date): string;
  // sayings[kyivDayOfYear(date) % sayings.length]; "" if sayings is empty
  // (never throws on an empty corpus, though the shipped corpus is fixed
  // and non-empty).
```

The `nbu` namespace for a generically-useful Kyiv-calendar helper is a minor
pre-existing structural quirk (the file predates any non-NBU consumer) — not
worth renaming/moving for one additional export in a small optional slice
(YAGNI). Flagged here for visibility, not acted on.

## Risks / Trade-offs

| Risk | Mitigation |
| --- | --- |
| A 12-entry corpus repeats roughly monthly (365/12 ≈ 30) | Acceptable for flavour text in an MVP; not a correctness concern. |
| Prop-threading through 3 components for one string feels heavy | Matches the existing, already-justified `initialStale` pattern exactly — consistency over a one-off shortcut. |

## Migration Plan

1. `lib/nbu/kyivDate.ts`: add `kyivDayOfYear` + tests (existing tests untouched) — red → green.
2. `lib/sayings/sayings.ts`: the corpus (no tests needed — pure data, validated by `selectSaying`'s tests and the brand-voice check below).
3. `lib/sayings/selectSaying.ts` + tests — red → green.
4. Thread `saying` through `page.tsx` → `RatesView` → `AppShell` → `AppFooter`.
5. `npm run verify` green; live-verify in the browser; hand off to checkers.
6. On archive, sync no delta specs (implementation-only); baseline unchanged.

## Open Questions

None blocking.
