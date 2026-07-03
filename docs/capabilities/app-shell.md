# Capability: app-shell

**Wave 0 · foundation.** The base layout, locale, and design-system wiring every UI slice inherits.

## Purpose
Establish the responsive Next.js shell, Ukrainian localization, design-system
integration, and global honesty/deadline surfaces so feature slices don't each
re-solve them.

## Requirements
- NFR-RESP-01 — responsive desktop → phone; touch targets ≥ 44px.
- NFR-A11Y-01 — sufficient contrast, legible fonts, never color-only signals.
- BC-LANG-01 — Ukrainian UI; score/date formats to the Ukrainian standard.
- TC-STACK-01 — vanilla-CSS design system (`design-system/`), no CSS framework.
- TC-PLATFORM-01 — responsive web only.
- BC-DEADLINE-01 — surface admissions deadlines prominently (passive surface).

## Scope
**In:**
- Root layout, global navigation/frame, responsive grid.
- Design-system CSS load order (tokens → typography → base → components) per `DESIGN.md`.
- Fonts: Unbounded (headings/numerals), Manrope (body).
- Ukrainian copy scaffolding + `uk` number/date formatting helpers.
- Global disclaimer slot (BC-HONESTY-01) and deadline banner slot (BC-DEADLINE-01).

**Out:** feature pages themselves; active deadline reminders (`deadline-reminders`).

## Depends on
Nothing (may reference `DESIGN.md` tokens).

## Consumed by
All UI capabilities.

## Key acceptance
- Layout adapts correctly from desktop to phone-sized browser window; targets ≥ 44px.
- UI renders in Ukrainian with `uk`-formatted numbers/dates.
- `--pk-*` tokens / `.pk-*` classes in use; no hardcoded colors/sizes.
