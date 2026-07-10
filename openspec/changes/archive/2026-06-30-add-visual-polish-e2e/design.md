## Context

This is the capstone (change 11 of 11). Every prior change shipped a styled screen or a headless
layer and checked it against its own `doc/web` PNG in isolation; none proves the *assembled* app
reproduces the maket, that all cross-screen states exist, that the app is accessible and
keyboard-operable, or that the `goals.md` headline — "works end-to-end with the network cut, and
progress reconciles furthest-wins" — holds against a real server.

The maket is the visual source of truth: `doc/web/*.png` (desktop/PWA) and `doc/mobile/*.png` (phone)
are hand-rendered captures of every screen. The hard part of automating "matches the maket" is that
those PNGs are *design intent*, not output of any specific browser/OS: fonts, antialiasing, and exact
dimensions differ from a live Chromium render, so a naive pixel diff against them can never reach
zero. The harness must therefore separate "is this faithful to the maket?" (a tolerant render-and-
compare) from "did this screen drift since we last accepted it?" (a strict, app-vs-app golden gate).

The stack is decided (`stack.md`): Vitest for unit/component, **Playwright (vendored) for e2e**.
Tailwind 4 styles app chrome only; book typography is readium-css inside the navigator. The e2e
backend is the throwaway Docker Komga in `test/komga/`, seeded from `test-epubs/`, with a
least-privilege reader account.

## Goals / Non-Goals

**Goals:**

- An automated, deterministic Playwright visual-regression suite that gates the release on every
  maket screen matching its `doc/web` / `doc/mobile` PNG within an agreed tolerance.
- Verification (and the targeted polish needed to pass it) that every interactive and cross-screen
  state exists and is styled to the maket.
- Accessibility and keyboard-operability gates (axe-core, focus order, names, focus-trap, WCAG AA
  contrast across the chrome and the four reading themes).
- Responsive checks across phone/tablet/desktop, including the RTL comic reader.
- The full offline happy path running against the Docker Komga, gated on `pnpm komga:provision`, also
  serving as the PR video demo.

**Non-Goals:**

- Any new product surface — no new routes, screens, components, connectors, or formats. This change
  consumes the prior capabilities; it does not extend them functionally.
- Re-specifying behavior owned by earlier changes (reading themes/layout belong to
  `reading-preferences`; offline storage + outbox + furthest-wins belong to `offline-and-sync`;
  the install-then-retry flow belongs to `extensions-and-capability-install`). This change references
  them and asserts their *visible* result.
- Pixel-perfect parity with hand-rendered PNGs — a documented tolerance, not zero diff, is the bar.

## Decisions

- **Two-tier visual strategy: tolerant render-and-compare to the maket + strict committed goldens.**
  Tier 1 captures each screen and diffs it against the `doc/web` / `doc/mobile` PNG with
  `pixelmatch` under a generous, documented per-screen tolerance — this is the "matches the maket"
  fidelity check. Tier 2 uses Playwright `toHaveScreenshot()` against committed golden snapshots
  (themselves vetted in Tier 1 when first captured) under a tight tolerance — this is the
  deterministic drift gate that runs every CI run. *Alternative:* only goldens — rejected, it never
  proves fidelity to the maket. *Alternative:* only direct PNG diff — rejected, it is brittle across
  OS/fonts and not a stable CI gate.
- **Deterministic capture.** Fixed viewport + device-pixel-ratio matching each PNG; `await
  document.fonts.ready` (self-hosted Newsreader/Literata, so no CDN/race); animations and transitions
  disabled and `prefers-reduced-motion` forced; a frozen clock; and **masking** of inherently
  volatile regions (the faux browser-frame traffic-light dots, relative timestamps such as "Synced 2m
  ago" / "Last read 2h ago"). *Alternative:* raw capture — rejected as flaky.
- **Visual specs run on a seeded "maket fixture"; Komga is reserved for the functional e2e.** The
  in-memory fixture connector (from `library-browse`) is seeded to mirror each PNG's exact content
  ("342 titles · 3 sources", Pride and Prejudice at 38%, the six "Recently added" covers, etc.) so
  renders are deterministic and serverless. *Alternative:* screenshotting live Komga content —
  rejected; server content/order varies, it is slow, and the roadmap is fixture-first.
- **Komga e2e is a separate, gated Playwright project.** CI runs `docker compose -f
  test/komga/docker-compose.yml up -d komga` then `pnpm komga:provision` (blocks, exits 0) before the
  project; the connector authenticates as the least-privilege `reader@edda.test`. When Komga is not
  reachable the project is **skipped, not failed**, so unit/visual/a11y stay fast and serverless.
  *Alternative:* always-on e2e — rejected; it would force Docker on every run.
- **Offline is exercised for real, not mocked.** The flow downloads a book to OPFS, then uses
  Playwright `context.setOffline(true)` to cut the network and reads from local storage (book bytes
  bypass the service worker via OPFS `File.slice`/`206`), then `setOffline(false)` to let the outbox
  flush and reconcile furthest-wins. *Alternative:* stubbing the network layer — rejected; it would
  not exercise the real offline path the `goals.md` acceptance demands.
- **Accessibility is gated by `@axe-core/playwright` plus explicit keyboard tests.** Axe runs on every
  screen (fail on serious/critical); keyboard tests assert focus order, operability, modal focus-trap
  + Escape, and accessible names on icon-only controls; contrast is checked on the chrome and on each
  of the four reading themes. *Alternative:* manual a11y review only — rejected; not repeatable or
  gateable.
- **Tolerances are explicit and recorded.** Starting points (tuned during implementation when goldens
  are first captured): Tier-1 maket compare `maxDiffPixelRatio ≈ 0.02` with `pixelmatch threshold ≈
  0.1`; Tier-2 golden drift `maxDiffPixelRatio ≈ 0.01`. Final per-screen values are committed
  alongside the baselines so "the agreed tolerance" is a concrete, reviewable number.

## Risks / Trade-offs

- [Font/antialiasing differences across OS/CI make screenshots flaky] → Self-hosted fonts +
  `fonts.ready` await; run the golden gate in one canonical browser/OS (Chromium on the CI Linux
  image); generous Tier-1 tolerance, tight Tier-2 tolerance.
- [Hand-rendered PNGs can never diff to zero against a live render] → That is exactly why Tier 2
  (goldens) is the strict gate and Tier 1 uses a documented tolerance; the PNG is the design
  reference, the golden is the regression reference.
- [Komga e2e is slow and needs Docker → CI friction] → Gate it (skip when unprovisioned) as a
  separate project; keep visual/a11y/unit serverless and fast.
- [Volatile content (timestamps, traffic-light dots) causes spurious diffs] → Mask those regions and
  freeze the clock in the capture helper.
- [Dark/Sepia/Parchment reading themes may fail AA contrast at some sizes] → Check all four themes
  explicitly; any token fix lands in the owning capability (`reading-preferences`, cross-referenced),
  not here.
- [The test library has only EPUBs, no PDF/CBZ] → The capability-missing (PDF) and RTL-comic (CBZ)
  screens are covered visually on the seeded fixture/mock; the Komga e2e exercises only the EPUB
  path. Extending the e2e to a real CBZ/PDF is deferred (see Open Questions).

## Open Questions

- Exact per-screen tolerance numbers — finalized when goldens are first captured and committed.
- Where the PR video lives — Playwright's recorded `video`/trace of the e2e run, or a manual
  screencap pasted into the PR template. Default: attach the Playwright video and link it per the PR
  template.
- Whether to seed a CBZ and a PDF into the Komga test library so the RTL-comic and capability-missing
  flows can be exercised end-to-end rather than on fixtures — deferred; out of scope for v1, which is
  EPUB-only.
