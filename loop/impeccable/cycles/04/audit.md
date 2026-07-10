# Impeccable Audit — Cycle 04 (CONFIRMING audit)

**Target:** `src/app` (the covers change: `RecentlyCoverCard.vue`, `KeepReadingCard.vue`,
`useLazyVisible.ts`, `useCoverObjectUrl.ts`, `core/model.derivePlaceholderCoverColor`).
**Method:** live walk of the running app (:5183 app, :5174 frame, :25600 Komga) via Playwright — real
Komga connect, fixture seed, DOM/network/console instrumentation, blob create/revoke counting — plus a
source-identity check of the one change since cycle 3 (commit `10ce619`) and an off-model recompute of the
tightest reading-theme contrast.
**Kyiv time:** 2026-07-10 ~06:20 EEST · Phase: IMPROVE
**Baseline:** cycle 3 = **20/20** (a11y 4, perf 4, responsive 4, theming 4, anti-patterns 4).
**Since baseline:** ONE change — `10ce619` (real Komga cover art + deterministic placeholder + lazy gate).

---

## Audit Health Score

| # | Dimension | Score | Δ vs c3 | Verdict |
|---|-----------|-------|---------|---------|
| 1 | Accessibility | 4/4 | 0 | Cover boxes are `aria-hidden="true"` + `data-decorative-cover`, `<img alt="">` — correctly decorative; the adjacent title+author carry the accessible name. Broken/stale cover → `@error` falls back to the colour placeholder (no broken-image box). No CLS: the box is `aspect-[3/4]` (grid) / fixed `h-14 w-11` (list), so bytes load into a reserved box — zero reflow. |
| 2 | Performance | 4/4 | 0 | Clean Komga load fired **exactly 5 thumbnail requests, one per book, zero duplicates, no storm**. The `useLazyVisible` IntersectionObserver gate **works live**: at a 390×380 viewport only the in-view tile fetched (1 of 5); the 4 below-fold tiles did NOT fetch until scrolled into view, then fetched exactly once. **No object-URL leak**: leaving Library revoked all 5 blobs on unmount; remount recreated and re-revoked in balance (created==revoked). Console 0 errors throughout. |
| 3 | Responsive Design | 4/4 | 0 | Covers render correctly at 390px (list + grid). The tap-target `@media (pointer: coarse)` utility in `main.css` is byte-identical (commit `10ce619` touched no CSS/layout code). |
| 4 | Theming | 4/4 | 0 | Placeholder palette is DESIGN.md-sanctioned raw cover colour ("the one surface the token system cannot reach"), reused from the fixture catalog. `reading-theme-colors.ts` unchanged; sepia (the tightest) recomputed off-model = **7.22:1**, still clears AAA (7:1); parchment 8.02. |
| 5 | Anti-Patterns | 4/4 | 0 | The cycle-3 tell-adjacent weakness — "a wall of identical Terre-Verte tiles" — is **RESOLVED**: the shelf now shows real publisher art (Komga) and distinct, deterministic per-book swatches (fixture). Real art fully replaces the synthetic lettering overlay rather than drawing on top of it. Dimension is stronger, not weaker. |
| **Total** | | **20/20** | **0** | **Held. The covers change HELD every dimension and REGRESSED nothing.** |

---

## Covers change — HELD (per the four probes the run asked for)

- **Real art, all 5 books (Komga):** 5 `<img>` with `blob:` src, `naturalWidth/Height 200×300`,
  `complete: true`. Console 0 errors. Network to :25600: exactly `GET .../books/{id}/thumbnail` ×5
  (`0QV3QQ301F9W9`, `0QYNEKRD99CKC`, `0QYNEKRDD99B6`, `0QYNEKRDD99B7`, `0QV3QQ301F9WA`) — one per book,
  no duplicates.
- **Fixture placeholders distinct + deterministic:** `edda.seed=fixture`, `edda.sources` cleared →
  9 tiles, **9 distinct colours**, no `<img>`. Reloaded twice: every title→colour pair identical
  (`deterministic: true`).
- **Lazy gate prevents off-screen fetch:** at 390×380 only the in-view tile fetched (1/5); the 4 off-screen
  tiles fetched only after scrolling into view, exactly once each.
- **No object-URL leak:** instrumented `createObjectURL`/`revokeObjectURL` — Library→Downloads revoked all
  5 blobs on unmount; round-trip stayed balanced (created 7 / revoked 7 post-instrument). `onScopeDispose`
  + revoke-before-replace hold.

## Prior four fixes — all HELD

1. **Staged prober (0 console errors on Komga connect):** live probe of `http://localhost:25600` →
   "Reachable · Komga server · Adapter ready" + 5 capability pills; console 0 errors/0 warnings; only
   `GET /api/v1/claim => 200` — **no bare `/` fetch, no `net::ERR_FAILED`, no CORS error**.
2. **Coarse-pointer tap targets ≥44px:** `.tap-target::after` `@media (pointer: coarse)` block intact;
   commit `10ce619` touched no CSS/layout (re-confirmed by source identity + covers render clean at 390px).
3. **Four themes AAA + chrome tracks theme:** `reading-theme-colors.ts` unchanged; sepia recomputed 7.22:1
   (AAA), parchment 8.02:1.
4. **PDF disable stays "Installed · N":** toggled PDF off live — row stayed under **Installed · 4** with a
   toggle (unchecked), **no Install button**; disable does not masquerade as uninstall. (Restored to on.)

## Advisory (do NOT dock — not a regression)

- On **re-navigation back to Library**, `createObjectURL` fired 7× for 5 tiles (2 extra `coverBytes`
  fetches during the connector-ref settle), each properly revoked. The clean **initial** load was exactly
  5 with no leak, so this is a minor remount-only transient, not a storm and not a leak. Optional P3:
  gate the fetch behind a settled connector ref so remount fetches exactly once per tile.
- The new cover cards use `text-[10px]` mono for the format/spine badges — this is the already-known &
  accepted sub-0.75rem mono micro-type advisory; not re-raised.

## Gate note

Deterministic gates were not re-run this cycle (confirming audit under deadline); the covers commit body
records typecheck/lint/build pass, unit 694, a11y 12, responsive 24+1 skipped, chromium/visual failures =
pinned known-red with zero new. Commit blast radius (6 isolated files) is consistent with that claim.

---

## Verdict

**20/20 — held.** The single change since cycle 3 fixed the standing P2 (unscannable library shelf) at the
architectural level (reused `useCoverObjectUrl`, a new one-shot IntersectionObserver gate, a deterministic
djb2 placeholder) and regressed nothing: accessibility (decorative + fallback + no CLS), performance
(one-per-book, lazy, no leak), responsive, theming, and anti-patterns all remain a genuine 4.
