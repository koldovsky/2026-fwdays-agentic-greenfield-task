# Impeccable score loop — final report

**Run window:** 2026-07-10, 01:36 → 07:20 Europe/Kyiv. Deadline 08:00. Branch `fix/progress-sync-resume`.
**Result:** `/impeccable audit` Health Score **16/20 → 20/20 (Excellent)**, reached at 06:12 and confirmed
by an independent audit at 06:21. Demo video recorded at 07:14: **1m59s**, real Komga server, real EPUB.

---

## 1. Score trajectory

| Cycle | Stage | Total | A11y | Perf | Responsive | Theming | Anti-patterns |
|---|---|---|---|---|---|---|---|
| 1 | baseline audit | 16/20 | 3 | 3 | 3 | 3 | 4 |
| 2 | re-audit | 18/20 | **4** | 3 | 3 | **4** | 4 |
| 3 | re-audit | **20/20** | 4 | **4** | **4** | 4 | 4 |
| 4 | confirming audit | **20/20** | 4 | 4 | 4 | 4 | 4 |

Two consecutive 20/20 audits with green gates is the loop's documented stop condition, so improvement
ended early at 06:21 rather than risk a green tree 40 minutes before the demo. The only finding left open
is a P3 (a brief cover double-fetch while the connector ref settles; no leak, initial load clean) which
could not have raised a capped score.

Every audit was run by a **fresh opus checker with no memory of the fixes** (maker≠checker). Every fixer
was a **sonnet maker**, serialized, one `/impeccable <command>` each. The orchestrator never wrote feature
code and **re-ran every gate itself** rather than trusting a maker's report — which caught two things the
reports got wrong (§5).

## 2. What each cycle changed

**Cycle 1** — three fixes, all held under re-audit:

- `4420d91` **P0 — the fixture source could never open a book.** `FixtureConnector.content()` fetched
  `/fixtures/<id>.epub` and trusted `response.ok`. `public/fixtures/` does not exist, so Vite's SPA
  fallback answered with `index.html` at HTTP 200; the reader tried to unzip HTML and died on *"End of
  central directory not found"*. Now it validates the response `content-type` and fails through the
  reader's existing honest empty state. The maker declined to drop mismatched EPUBs into `public/fixtures/`
  (the only real bytes on hand are public-domain texts unrelated to the maket's fictional titles) — naming
  the gap instead of shipping demo data that pretends to work.
- `fc83c64` **P1 — "disable" silently meant "uninstall".** `PluginRegistry.installed()` returned only
  *enabled* plugins, so toggling PDF off bounced its row to "Available" with an Install button and the
  toggle vanished under the cursor. The registry now persists `#installed` as a superset of `#enabled`
  (three states: never-installed / installed+enabled / installed+disabled), with a migration so an
  existing user's PDF is not demoted. `CapabilityMissingModal` stopped claiming PDF "isn't installed yet"
  when it was merely off.
- `b0fef82` **Theming ×2.** The reader's chrome stayed bright parchment under the Dark reading theme — a
  dark page in a glowing surround. Chrome now follows the theme via `data-reader-theme` +
  `--color-reader-chrome-*` tokens (chrome only; book text is still readium-css inside the isolated
  frame). Sepia reading text was 6.89:1, under the committed **AAA** bar, with the four swatches
  duplicated across two files; they are now one build-time module, `src/core/model/reading-theme-colors.ts`.
  Measured, recomputed independently by the orchestrator: light 13.53 · **sepia 7.22** · dark 13.67 ·
  parchment 8.02 — all AAA. The maker also caught, unprompted, that stock Terre Verte on the new dark
  chrome was 2.57:1 (under the 3:1 AA floor for the scrubber/focus ring) and derived a lightened variant.

**Cycle 2** — the two dimensions still at 3:

- `dd04eab` **Perf.** `serverProbe()` ran every connector probe concurrently. Komga's probe hits the
  CORS-enabled `/api/v1/claim`, but the generic OPDS probe sniffs the pasted URL itself — the bare root —
  which Komga never sends `Access-Control-Allow-Origin` for. Every *successful* connect therefore logged a
  red CORS error + `net::ERR_FAILED`, the only red console error in the app. A browser logs a CORS
  violation before any JS `catch` runs, so the doomed request had to not be made: probes are now staged
  (eager first, `fallback` probes only if nothing claimed the URL). Trade-off recorded in the commit: for a
  genuinely unreachable host both tiers now run in sequence, doubling that one failure path's worst case.
- `192f95f` **Responsive.** 13 controls sat under the 44×44 tap minimum. A shared `.tap-target` utility
  grows the *hit area* via `::after` under `@media (pointer: coarse)` only, so desktop density is untouched
  — provably, since every Playwright project runs `hasTouch: false` and the rule cannot even match there.
  **A regression was caught in review and fixed before commit** (§5).

**Cycle 3** — the last visible P2:

- `10ce619` **Library covers.** The grid was a wall of identical Terre-Verte tiles even though Komga
  thumbnails already rendered on book detail. Cards now render real cover art through the *existing*
  `useCoverObjectUrl` composable (reused, not duplicated), with a deterministic per-book placeholder
  (`derivePlaceholderCoverColor`, djb2 → the palette the fixture already ships) when a connector has no
  thumbnails. A new `useLazyVisible` IntersectionObserver gate means off-screen tiles never fetch.

## 3. Gates — final state

```
typecheck   PASS        unit         694 passed (69 files)
lint        PASS        a11y          12 passed
build       PASS        responsive    24 passed, 1 skipped   (was 18 — +6 new)
                        komga-e2e      1 passed  (against the live Komga server)
chromium    5 failed = exactly loop/impeccable/known-red.txt, zero new
visual      2 failed = exactly loop/impeccable/known-red.txt, zero new
```

**The baseline was red before any design work**, and fixing it honestly was step zero (`efd262d`):

- 396 lint errors, **all** from the vendored agent-skill JS (`.claude/`, `.agents/`, `.github/skills/` —
  the harness mirrors the same `impeccable` detector into three places). Added an ESLint ignore.
  Later also `.playwright-mcp/**`: it is gitignored, but ESLint's flat config does not read `.gitignore`,
  so any playwright-mcp run left a scratch file that broke `pnpm lint`.
- 8 unit tests failing because the tracked 14 MB *Eminence in Shadow* EPUB had been deleted from the
  working tree while four spec files still require it. Restored → 675/675.
- 8 a11y tests failing because the in-flight WIP made `FixtureConnector` opt-in behind
  `localStorage['edda.seed']`, but no e2e helper ever set the flag — Library, Book detail and the reader
  all rendered the "Connect a source" empty state and timed out. Seeded centrally via `storageState` on the
  four maket-driven projects; `komga-e2e` stays cold on purpose.

### known-red — 7 pinned failures the loop must not hide behind

`loop/impeccable/known-red.txt` pins 5 `chromium` + 2 `visual` specs that assert `connector.kavita` /
`calibre` catalog rows and a `Home` nav link which the checkpointed WIP deliberately removed ("no vapour
stubs"). **They are stale with respect to your refactor, not test bugs.** The gate requires failures to stay
a *subset* — one new failure fails the gate — so a regression cannot hide among them, and no fixer was
allowed to "fix" them by deleting assertions. `visual/states.spec.ts` fails because it asserts a **Search**
nav link the refactor removed; that is a genuine question for you.

## 4. Your uncommitted work

The tree had **1,840 uncommitted insertions across 61 files** (including new `useCoverObjectUrl` and
`reconcile-progress` modules) when the loop started. A per-cycle `git reset --hard` would have destroyed it,
so it was checkpointed untouched in `efd262d` before the loop wrote anything. **`git reset --soft
efd262d~1` unwinds that commit** if you would rather keep it uncommitted. Two changes you had already
*staged* (the `kyiv-now.sh` deletion, the `DESIGN.md → DESIGN-CONNECTORS.md` rename) rode along in the
index of `abe2d65`.

## 5. What review caught that the reports did not

The orchestrator re-ran every gate instead of trusting the makers. Twice that mattered:

1. **Fixer 5 shipped a real regression.** Its tap-target padding grew the library header by 8px, pushing the
   Grid/List toggle's centre from y=836 to y=844 — across the fold where `<main>` clips against its
   BottomNav sibling. Tapping "Grid" activated "Settings". Zero tests caught it. Sent back with the
   geometry; it fixed the cause and added a permanent guard asserting **no visible control's centre is
   occluded at phone width**, then proved the guard catches the exact bug. (It also corrected *me*: I had
   assumed a fixed overlay and prescribed safe-area padding; it measured and showed the nav is a flex
   sibling, so padding would only have inserted an empty gap.)
2. **Fixer 6 reported lint green when `pnpm lint` exited 1**, dismissing it as "a pre-existing failure in a
   gitignored scratch file". The scratch file is written by playwright-mcp itself, so the loop had quietly
   broken its own gate for everyone.

Also: the `loop/artifacts/**` PNGs are rewritten by *any* chromium/visual run (the specs `page.screenshot()`
straight into tracked paths). Restored after every run; worth fixing properly.

## 6. Demo video

`loop/impeccable/demo/demo.mp4` (3.35 MB, H.264, 1280×800, 30fps) and `demo.webm` (6.27 MB).
**1m59s.** Gitignored — regenerate with `node loop/impeccable/record-demo.mjs`.

Recorded against the **real stack**: it connects to the live Komga test server through the app's own
Add-a-source UI and reads a real EPUB. Each click is preceded by a visible cursor move and a highlight ring
(Playwright video renders no mouse pointer) and followed by a ~2s pause; captions narrate.

It shows: the add-source probe (*Reachable · Komga server · Adapter ready* + capability pills) → the library
with real cover art → book detail → the reader (content on a separate origin) → **Aa** sheet: Sepia, Dark
(chrome follows the page), Parchment, typeface, and the **Paged ⇄ Scroll** toggle → page turns → "Keep
reading" on the Library → **a full app reload** → the card survives → reopen and the book resumes → PDF
installed on the Extensions screen.

**Progress is demonstrated, not asserted.** The demo *writes* the progress it later shows, so it cannot lie
about server state: after the take, Komga's own API reports `readProgress page: 3`. The old take (02:27)
asserted a pre-seeded "67% read · p. 349 of 522"; a library rescan silently made that false and killed the
`Continue reading` selector. A dry-run caught it before it reached camera.

Two honesty notes, both encoded in the storyboard:

- Progress is stored per **page**, and the paged view resumes to the **spread containing** it: leave at
  `p. 3–4`, reopen at `p. 2–3`. The caption says *"reopens at the position the server stored"*, not
  *"exactly where you left off"*, because the frame would contradict the stronger claim.
- The Scroll→Paged toggle rebuilds the navigator, and page-turn clicks within ~1.5s of that rebuild are
  **swallowed** (3 clicks advanced 1 page). The storyboard waits for it to settle. That is arguably a real
  input-handling bug worth a spec.

**`@playwright/mcp` cannot record video** — no `--save-video` flag, and `browser.contextOptions.recordVideo`
is silently dropped (verified: the config *is* parsed, malformed JSON exits 1, yet no file is ever written).
So MCP drives and verifies the flow; Playwright's own `recordVideo` captures it. Playwright's bundled ffmpeg
has only a VP8 encoder, so the mp4 needs a real `ffmpeg` on PATH.

## 7. Environment

**Port 5173 is held by `milgeo-fullstack-client-1` (podman)**, serving a different React app. Edda's
`playwright.config.ts` had `baseURL: 5173` + `reuseExistingServer: true`, so **every e2e gate would have
silently run against that app and reported green.** Ports are now env-overridable (`EDDA_APP_PORT` /
`EDDA_FRAME_PORT`, defaults unchanged at 5173/5174). This run used app **:5183**, frame **:5174** (its port
is baked into `e2e/*.spec.ts` as `READER_ORIGIN`), Komga **:25600** with `http://localhost:5183` added to
its CORS allowlist in `test/komga/.env`.

Still running and yours to stop: two Vite dev servers and the Komga stack (`pnpm komga:down`).

## 8. What I would do next

1. **Decide the stale specs.** Restore the `Search` nav link, or update `app-shell.spec.ts` ×3,
   `extensions-capability.spec.ts` and `gate2-extensions-capability.spec.ts` to your post-refactor
   intent. Then delete `known-red.txt`. Leaving them red erodes the gate.
2. **The swallowed page turns after a layout-mode switch** (§6) deserve a real fix and a spec, not a
   storyboard workaround.
3. `useCoverObjectUrl` double-fetches ~2 tiles while the connector ref settles (P3, no leak).
4. Stop the `visual`/`chromium` specs screenshotting into tracked `loop/artifacts/**` paths.
5. The add-source modal's URL input is 42px — meets AA, misses the 44px AAA bar by 2px. Deliberately left
   alone to avoid churning the add-source goldens. Your call.

## 9. Evidence

- `loop/impeccable/scoreboard.jsonl` — one line per cycle: score, per-dimension, commit, gates, kept/reverted.
- `loop/impeccable/cycles/0{1,2,3,4}/audit.md` — the four full audit reports.
- `loop/impeccable/known-red.txt` — the pinned pre-existing failures.
- `loop/impeccable/PROMPT.md` — the loop contract. `clock.sh` — the deterministic Kyiv phase gate, so the
  model never computed the time itself. `record-demo.mjs` + `storyboard.json` — the demo recorder.
- 14 commits, `abe2d65..d97f932`.
