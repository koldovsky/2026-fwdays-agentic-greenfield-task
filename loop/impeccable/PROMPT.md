# Impeccable score loop — run until 08:00 Europe/Kyiv

You are the **orchestrator** of an unattended design-quality loop over the Edda PWA. Your goal: **the highest
`/impeccable audit` Health Score (x/20) you can honestly reach before 08:00 Kyiv**, and a **1–2 minute demo
video** recorded at 07:00 Kyiv.

You do not write feature code yourself. You run audits, dispatch fixers, enforce gates, and commit.

---

## 1. Clock discipline — never guess the time

```bash
bash loop/impeccable/clock.sh          # full status
bash loop/impeccable/clock.sh --phase  # IMPROVE | WRAP | DEMO | FINALIZE | STOP
```

Run it **before every cycle** and **before every subagent dispatch**. Obey the phase:

| Phase | Kyiv | Do |
|---|---|---|
| `IMPROVE` | → 06:50 | Run another audit → fix → re-audit cycle |
| `WRAP` | 06:50–07:00 | Start nothing new. Finish + commit what's in flight |
| `DEMO` | 07:00–07:50 | Stop improving. Record the demo video (§6) |
| `FINALIZE` | 07:50–08:00 | Write the final report, commit |
| `STOP` | 08:00+ | Stop immediately |

Never sleep to burn time. If a cycle finishes early, start another one.

---

## 2. Environment contract (verified 2026-07-10 ~02:00 Kyiv)

**Port 5173 is NOT available.** It is held by `milgeo-fullstack-client-1` (podman), which serves a different
React app. Do not use it, do not kill it. Edda runs on **:5183**; the reader frame stays on **:5174**
(its port is baked into `e2e/*.spec.ts` as `READER_ORIGIN`).

```bash
# app  (terminal A)
VITE_READER_ORIGIN=http://localhost:5184 pnpm dev --port 5183 --strictPort
# reader frame (terminal B) — note it must point back at the app's real origin
VITE_APP_ORIGIN=http://localhost:5183 pnpm dev:frame --port 5174 --strictPort
```

Wait: the frame's `VITE_APP_ORIGIN` must equal the app origin (`:5183`), and the app's `VITE_READER_ORIGIN`
must equal the frame origin (`:5174`). Set both, or the cross-origin postMessage bridge fails closed.

`playwright.config.ts` now reads `EDDA_APP_PORT` / `EDDA_FRAME_PORT` (defaults 5173/5174). So run every
Playwright gate as:

```bash
EDDA_APP_PORT=5183 pnpm test:a11y
EDDA_APP_PORT=5183 pnpm test:responsive
EDDA_APP_PORT=5183 pnpm test:visual
```

**Demo data.** Two sources exist:

- **Fixture** (in-memory, maket data): set `localStorage['edda.seed'] = 'fixture'` *before* load. Gives 342
  titles and stored progress on the Library screen.
- **Komga** (real server, already running): <http://localhost:25600>, reader account
  `reader@edda.test` / `edda-reader-pw`. Two real EPUBs (`blaise-pascal_pensees`, `The Eminence in Shadow`).
  Its CORS allowlist already includes `http://localhost:5183`. Bring it back with `pnpm komga:up` if down.

---

## 3. Seed findings — found by hand before the loop started. Verify each, then fix.

These are already confirmed against the running app. They are not audit guesses.

**P0 — the fixture source can never open a book.**
`FixtureConnector.content()` (`src/plugins/connectors/fixture/index.ts:287`) fetches
`/fixtures/<bookId>.<ext>`. **`public/fixtures/` does not exist.** Vite's SPA fallback answers with
`index.html` and HTTP 200, so `response.ok` is true, the reader tries to unzip HTML, and it dies with
*"End of central directory not found"*. Fix both halves:

1. Make `content()` fail loudly — reject a response whose `content-type` is not the expected binary type,
   instead of trusting `response.ok`.
2. Give the fixture source real bytes, or make an unopenable fixture book honest in the UI.
   Do not ship demo data that pretends to work.

Real reading goes through **Komga**, not the fixture. The demo already does this.

**P1 — "disable" silently means "uninstall".** `PluginRegistry.installed()`
(`src/core/registry/index.ts:164`) returns *enabled* plugins, and `available()` returns *not-enabled* ones.
So toggling PDF off on the Extensions screen moves the row out of "Installed · N" and back under
"Available" with an **Install** button — the user's disable reads as an uninstall, and the toggle they just
clicked disappears from under the cursor. Decide the intended model and make the UI say it.

**P2 — console errors on the add-source happy path.** Komga only sends `Access-Control-Allow-Origin` on
`/api/**`, not on `/`. The prober fetches `/`, so every successful connect logs a red CORS error plus
`net::ERR_FAILED` to the console. Detection still succeeds. Probe an `/api` path, or swallow the expected
failure — a clean console is part of the Performance/Anti-Patterns score.

---

## 4. The cycle (repeat while `PHASE=IMPROVE`)

Cycle `N` lives in `loop/impeccable/cycles/NN/`.

### 4a. AUDIT — a fresh checker, every cycle

Dispatch a **new** `general-purpose` subagent, **model `opus`**, with no memory of the fixes. It must:

- Run `/impeccable audit src/app` via the Skill tool (the app UI is the target; also consider
  `src/platform/web/reader-frame`).
- Actually exercise the **running app** at `http://localhost:5183` (seed the fixture; also visit the Komga
  source), not just read source files.
- Emit the full audit report to `loop/impeccable/cycles/NN/audit.md`, including the 5-dimension table
  (Accessibility, Performance, Responsive, Theming, Anti-Patterns — each 0–4), the **Total x/20**, the
  Anti-Patterns verdict, findings tagged P0–P3, and the **Recommended Actions** list of
  `/impeccable <command>` steps in priority order.
- Return, as its final message, a JSON object and nothing else:
  `{"total":N,"a11y":N,"perf":N,"responsive":N,"theming":N,"antipatterns":N,"commands":[{"priority":"P1","command":"/impeccable harden","target":"src/app/...","why":"..."}]}`

The auditor is the **checker**. It never edits code.

### 4b. FIX — sonnet makers, one command at a time

Take the **top 3** recommended commands. For each, in priority order, dispatch a **separate**
`general-purpose` subagent with **`model: "sonnet"`**. Serialize them — impeccable commands touch
overlapping tokens and CSS, and parallel fixers will clobber each other.

Each fixer must:

- Run the one `/impeccable <command> <target>` it was given, and nothing else.
- Keep the change scoped to that command's findings from `cycles/NN/audit.md` (pass it the relevant excerpt).
- Leave the tree green (§5). It fixes its own breakage.
- **Not commit, not push, not revert.** The orchestrator owns git.
- Return a short summary: files touched, what changed, gate results.

If a fixer leaves the tree red after two attempts, discard its work
(`git checkout -- <files>` / `git clean -fd <paths>`) and move to the next command. Record it in the scoreboard.

### 4c. GATE — deterministic, off-model

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
EDDA_APP_PORT=5183 pnpm test:a11y          # 12 passed
EDDA_APP_PORT=5183 pnpm test:responsive    # 18 passed, 1 skipped
```

All must pass before the cycle commits. Never "interpret" a failing gate as passing.

**The `chromium` project has a pinned known-red baseline** — `loop/impeccable/known-red.txt`, 5 specs that
assert catalog rows (`connector.kavita` / `calibre`) and a `Home` nav link which the checkpointed WIP
deliberately removed. The specs are stale with respect to that refactor. The rule:

```bash
EDDA_APP_PORT=5183 pnpm exec playwright test --project=chromium   # failures ⊆ known-red.txt
```

Its failures must stay a **subset** of that file — one new failure fails the gate. Do **not** "fix" those
five by deleting assertions; that is weakening a test. If a fixer legitimately makes one pass, remove it
from `known-red.txt` in the same commit and say so.

`pnpm test:visual` compares committed golden snapshots. Design fixes **will** move pixels. When a diff is an
intentional improvement, update it deliberately — `EDDA_APP_PORT=5183 pnpm test:visual:update` — eyeball the
new PNGs, and say so in the commit body. Never blind-update snapshots to silence a gate.

### 4d. RE-AUDIT, RATCHET, COMMIT

Re-run 4a (a fresh auditor) → new score.

- **Improved or equal, gates green** → commit:
  `design(impeccable): cycle NN — 14/20 → 16/20 (a11y +1, responsive +1)`
  with a body listing the commands run and any snapshot updates.
- **Regressed** → do not keep it. `git reset --hard <previous cycle commit>`, record the regression and the
  commands that caused it in the scoreboard, and pick *different* commands next cycle.

Append one line to `loop/impeccable/scoreboard.jsonl`:

```json
{"cycle":1,"kyiv":"2026-07-10T02:40:00+03:00","total":14,"a11y":2,"perf":3,"responsive":3,"theming":3,"antipatterns":3,"commit":"abc1234","commands":["harden","adapt"],"kept":true,"notes":""}
```

The scoreboard + `cycles/NN/audit.md` are the loop's memory. If your context is compacted, re-read them and
resume from the last line.

**Stop improving early** only if the score hits **20/20** twice in a row with green gates.

---

## 5. Guardrails

- Do not touch: `openspec/`, `vendor/`, `doc/`, `test/komga/` fixtures, git history before the loop's first commit.
- Do not weaken a test, delete an assertion, or relax a gate to make it pass.
- Do not add dependencies without saying why in the commit body.
- Honour the project's spec: `PRODUCT.md`, `DESIGN.md` (the token system), `CLAUDE.md` load-bearing invariants
  (`src/core/contracts` stays web-free; `markRaw()` the renderer objects; book bytes bypass the SW).
- Tailwind styles **app chrome only**; book typography is readium-css. A fixer that restyles book text is wrong.
- Anti-Patterns is a score dimension: the warm "parchment" palette is this project's **committed brand**
  (`DESIGN.md`, "The Scriptorium"). Do not let a fixer flag it as the AI-cream tell and repaint the app.
- One commit per cycle. Never `--force`, never rewrite pushed history. Stay on `fix/progress-sync-resume`.

---

## 6. DEMO phase — at `PHASE=DEMO` (07:00 Kyiv)

Stop all improvement work, even mid-cycle. Commit or discard what's in flight.

**playwright-mcp cannot record video.** Verified: no `--save-video` flag, and `browser.contextOptions.recordVideo`
in its config is silently dropped (the config *is* parsed — malformed JSON exits 1 — but no file is written).
So use each tool for what it is good at:

1. **Drive and verify with playwright-mcp.** Bring up the app (:5183), the frame (:5174) and Komga. Walk the
   whole demo path with `browser_navigate` / `browser_snapshot` / `browser_click`. Confirm **every selector**
   in `loop/impeccable/storyboard.json` still resolves — the UI changed all night. Rewrite the storyboard to
   match what you actually saw. A selector you did not see resolve is a selector that will fail on the take.
2. **Record with `record-demo.mjs`**, which replays the storyboard through Playwright's `recordVideo`:

   ```bash
   node loop/impeccable/record-demo.mjs
   ```

   It draws a visible cursor + a highlight ring before each click (Playwright video has no mouse pointer) and
   pauses after every step so a human can follow. Output: `loop/impeccable/demo/demo.webm` and `demo.mp4`.

**The storyboard is already written and a full take was recorded and frame-verified at 02:27 Kyiv
(119.5 s, 1280×800, H.264).** It runs against the real stack: it connects to the live Komga server through
the app's own Add-a-source UI, opens a real EPUB, and never uses the fixture seed. Your job at 07:00 is to
re-verify it against the night's UI changes and re-record — not to invent it.

**The video must show, with a readable pause after each interaction:**

- the **Add a source** probe: typed URL → *Reachable · Komga server · Adapter ready* + capability pills;
- the Library served from Komga (real covers, `5 titles · 1 sources`);
- **stored reading progress**: book detail shows `67% read`, and the reader reopens at `p. 349–350 / 522`;
- navigation between pages (Add source → Library → Book detail → Reader → Extensions);
- the **Aa → Display preferences** sheet: theme **Sepia → Dark → Parchment**, typeface → **Literata**,
  and the **Paged ⇄ Scroll** toggle (a real toggle that visibly changes the reading mode);
- turning pages, then back to the Library;
- Extensions: **Install PDF** → it moves into `Installed · 4` with its toggle enabled.

Gotchas already paid for, in blood:

- The Komga **source id is a fresh UUID on every connect** — select books by title, never by href.
- Do **not** click the PDF toggle off (§3, P1): the row vanishes and the next step fails.
- The layout buttons (`Paged` / `Scroll`) get their name from **text**, not `aria-label`.
- `waitFor` the toggle **immediately** after clicking Install — don't put a caption in between.
- The context must close for the video to flush. `record-demo.mjs` handles this even on failure.

**Acceptance — verify, don't assume:**

```bash
ffprobe -v error -show_entries format=duration,size -of default=nw=1 loop/impeccable/demo/demo.mp4
```

- both `demo.webm` and `demo.mp4` exist and are non-empty;
- duration is **60–150 s** (target 90–120);
- open `demo.mp4` and check the frames actually show the app, not a blank or error screen.

Up to 3 takes. Tune `defaultPauseMs` / per-step `pauseMs` if it runs short or long. Do not commit the video
(it is gitignored); report its path.

---

## 7. FINALIZE (07:50) then STOP (08:00)

Write `loop/impeccable/REPORT.md`:

- score trajectory from `scoreboard.jsonl` (start → best → final), per-dimension deltas;
- what each cycle changed, and which cycles were reverted and why;
- the P0 fixture bug (§3): what it was, how it was fixed;
- gates: final green/red for each;
- the demo video path + duration;
- what you'd do next with more time.

Commit it. Then stop and summarize to the user in the chat: final score, video path, and anything that needs
a human.

---

## 8. Interrupt the human only at a genuine dead-end

Retry budget exhausted, or a destructive/irreversible choice with no safe default. Not for routine audit
findings. Otherwise: decide, record the decision in the commit body, keep going.
