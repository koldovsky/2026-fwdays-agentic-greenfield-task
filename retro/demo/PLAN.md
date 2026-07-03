# Demo video — production plan

> **Meta-material** (like the rest of `retro/`): not part of the editor contract, excluded from the
> harness gates. Everything in `retro/demo/` is regenerable-by-design — sources are committed,
> generated media (`out/`) is git-ignored **except the two committed deliverables**:
> `out/video.mp4` (captions burned) and `out/video-nocap.mp4` (caption-free, for live
> presentation). End-to-end rebuild: `make video`.

**Target:** 4:00 video · 1920×1080 @ 30 fps · OpenAI TTS narration · muted-playback-safe
(burned-in captions + `.srt`) · fully regenerable.

## Locked decisions

- **Length/structure**: 4 acts + close, 4:00 ceiling.
- **Audience**: mixed/conference, no prior Transon knowledge.
- **Voice**: macOS `say` with **Evan (Enhanced)** — free, offline, deterministic; natural pace
  ~147 wpm ≈ the script budget. (OpenAI TTS `tts-1-hd` remains a config-switch option if credits
  are ever added; the original choice hit `insufficient_quota` and the key was removed.)
- **Running example**: one transformation (key/value swap) appears as jq → Transon JSON → blocks
  across Acts I–II, so the viewer never re-learns the data.
- **Act IV footage**: a real reviewer-agent finding replayed as a styled terminal animation
  (authentic + regenerable; not a raw session screen-recording).
- **Design**: dark cards matching the committed editor theme; key claim of every act as on-screen
  text so the video works muted; captions and `.srt` derive from the same script source.
- **Resolution/framerate**: 1920×1080 @ 30 fps (4K buys nothing for slides + screencast).
- **Music bed**: optional, ambient, ~−20 dB under narration; added at assembly, trivially removable.
- **Home**: `retro/demo/` (this folder).

## Structure (4 acts + close)

| Act | Time | Story | On screen |
|---|---|---|---|
| I | 0:00–0:55 | Why Transon — transformations as data | HTML cards: honest jq one-liner foil → input/template/output diagram → benefits (storable, diff-able, generatable, safe) → pivot line ("you don't have to write trees by hand") |
| II | 0:55–1:45 | The editor | Live reference host via Playwright: load key/value-swap example → block edit → JSON syncs → Run → ✓ matches → reverse JSON edit → blocks follow |
| III | 1:45–2:35 | The generative architecture (metacompiler) | Animated pipeline diagram (engine metadata → G_* generators → palette/toolbox/codec → editor), then the live self-hosting moment: the editor imports its own palette generator |
| IV | 2:35–3:45 | Agentic engineering practices | SPEC.md FR blocks → traceability table → gates running green → terminal replay of a real round-trip-reviewer must-fix → animated test-count ramp (13 → 133 → 763 → 1387 → 1551 → 1600+) |
| Close | 3:45–4:00 | Takeaway + embed snippet + URL | Close card: "Transformations as data. An editor that never lies about your JSON. Built by agents, gated by machines." |

Bonus cut for free: a 2:00 version = Acts I–II + a one-line Act III/IV teaser, from the same assets.

## Phase 0 — Script (the foundation; everything is cut to fit it)

1. Write `retro/demo/script.md`: all 4 acts + close, word-counted per beat (~145 wpm), with
   per-beat caption text and on-screen visual annotations.
2. Write the honest jq one-liner for the key/value swap (Act I foil — must be the real jq for the
   same transformation the demo performs; no strawman).
3. **☐ CHECKPOINT: user reviews and approves the script.** Changing it later invalidates all
   downstream timing.

## Phase 1 — Risk burn-down (cheap tests before building anything big)

4. ☑ **DONE (2026-07-03)** — voice: macOS `say` **Evan (Enhanced)** (OpenAI account had
   `insufficient_quota`; key removed). User verified by ear: "Transon" OK; two respellings
   locked in the script.md TTS table — `JSON`→`Jaysawn`, `diff it`→`dihf it` (applied to
   narration text only). ffmpeg repaired (8.1.2). **Phase 1 fully closed.**
5. ☑ **DONE (2026-07-03)** — recording-quality test (`preflight/record-sample.mjs`): headless
   1920×1080 `recordVideo` webm of real block drags. Verdict: **headless capture is good** —
   crisp rendering, genuine 25 fps during motion (6 consecutive 40 ms frames all unique, no dup
   frames). Sample: `out/preflight/*.webm`. Headed+OBS fallback not needed on this evidence.
   Gotchas learned for the autopilot: Blockly labels use NBSP (match with normalized spaces);
   wait for readiness via `/Engine:\s*ready/` on `body.innerText` (not an exact-text locator);
   never click "New" mid-demo (native `confirm()` blocks the page — use `page.on('dialog')`).
6. ☑ **DONE (2026-07-03)** — pre-flight of the demo path (via the live reference host):
   - Engine `ready` ≤15 s cold, ~2 s warm; autopilot records only after ready.
   - Swap recipe loads: exactly 3 blocks + template/input panels as scripted.
   - Run → **"✓ Output matches expected"** with the inverted dict. Money shot confirmed.
   - Reverse sync confirmed: typing an `attr` variant into the JSON panel re-projects the canvas.
   - **Camera-legible block edit chosen:** detach `Current value (value)` → the JSON panel
     updates **mid-drag**, no error state (two top blocks are tolerated); drag back to restore.
     Script beat II.2 reordered to Run-first-then-edit (the ✓ must run on the pristine template).
   - Self-hosting confirmed: `packages/editor-core/src/codec/generators/G_palette.json` (16 KB)
     loads as **338 blocks**. Autopilot needs `zoomToFit` for that shot (and a higher zoom level
     generally — default zoom renders the 3-block example small at 1080p).

Item 4 waits on the key; it does not block Phase 2 (visuals are cut to audio at assembly time).

## Phase 2 — Assets (parallelizable)

7. **Slides** (`retro/demo/slides/`): Act I cards (jq foil, input→template→output diagram,
   benefits), Act III pipeline diagram, Act IV static visuals, close card (embed snippet + URL/QR).
8. **Act II autopilot** (`retro/demo/autopilot.ts`): Playwright drives example-load → block edit →
   JSON sync → Run ✓ → reverse JSON edit → blocks update; human-paced delays keyed to narration
   beat durations; Pyodide pre-warmed before recording starts.
9. **Act III live moment**: same autopilot records the editor importing its own palette generator.
10. **Act IV terminal replay**: styled typed-out animation of a real `round-trip-reviewer` finding
    (candidate: the M4 must-fix — the §7.15 surface check wrongly rejecting in-surface documents
    whose *data* contained the token) + gates-green capture + the animated test-count ramp.

## Phase 3 — Audio

11. `retro/demo/tts.ts`: `script.md` → one MP3 per beat via OpenAI TTS; measure clip durations →
    emit `timings.json`. (Requires `OPENAI_API_KEY` in the environment.)
12. Optional music bed (YouTube Audio Library), mixed at assembly.

## Phase 4 — Assembly & iteration

13. `retro/demo/assemble.sh` (ffmpeg): pad/cut each visual segment to its beat's audio duration
    from `timings.json`; burn captions; concat with crossfades; mux narration (+ bed); emit
    `out/video.mp4` + `out/captions.srt`.
14. `retro/demo/Makefile`: `make video` end-to-end; per-phase targets (`make audio`, `make demo`,
    `make slides`) for cheap partial rebuilds.
15. **☐ CHECKPOINT: user watches the rough cut** → iterate on wording/pacing/visuals; each fix is
    a partial rebuild, not a redo.
16. Final render + the 2:00 bonus cut.

### Rough cut #1 — DONE (2026-07-03): `out/video.mp4`, 3:24.5, all 16 beats

Phases 2–4 built and run end-to-end. Pipeline deviations from the original plan:
- **Captions:** this Homebrew ffmpeg build has **no libass/subtitles/drawtext** — captions are
  Playwright-rendered transparent PNGs (`gen-captions.mjs`) burned as **one overlay per segment**
  (a single 16-overlay pass over the full video was prohibitively slow). `captions.srt` is still
  emitted for distribution.
- Stills use explicit `-t` (not `-shortest`, which over-runs ~1.7 s per segment).
- ffmpeg 8 filtergraph syntax: `ass=filename=…` style keys required (positional args rejected).

Known rough-cut nits (fix candidates for iteration, none blocking the watch):
- (a) Act II blocks render small at default zoom (canvas mostly empty at 1080p).
- (b) Example-picker selection is instant — a native `<select>` never shows an open dropdown
  in headless capture.
- (c) IV.4: burned caption slightly overlaps the on-slide heading.
- (d) **Honesty check before final render:** the IV.4 ramp's last bar (1,616) and the narration's
  "sixteen hundred tests" are extrapolated from M5=1551 + post-M5 additions — run the full suite
  and pin the real number.
- (e) Act III.3 shows the raw top-left corner of the 338-block wall (no zoom-to-fit available
  without a workspace handle).

## Critical path & user inputs

Critical path: **script → approval → timings → assembly**. Rough cut achievable in one working
session after script approval; expect 1–2 iteration loops.

User-required inputs only:
- ☐ Script approval (Phase 0)
- ☐ `OPENAI_API_KEY` available in the environment (Phase 3)
- ☐ Rough-cut feedback (Phase 4)

## Folder layout

```
retro/demo/
  PLAN.md          ← this file
  script.md        narration + captions + visual annotations, per beat
  slides/          Act I/III/IV cards + close (HTML)
  autopilot.ts     Playwright: Act II demo + Act III self-hosting moment
  tts.ts           script.md → per-beat MP3s + timings.json (OpenAI TTS)
  assemble.sh      ffmpeg assembly → out/video.mp4 + out/captions.srt
  Makefile         make video / make audio / make demo / make slides
  out/             generated media (git-ignored)
```

## Known risks (tracked)

| Risk | Mitigation |
|---|---|
| TTS mispronounces "Transon" | Phase-1 item 4; phonetic respelling in script source |
| Pyodide load = dead air on camera | Pre-warm; record only after engine `ready` |
| Playwright webm choppy (~25 fps cap) | Phase-1 item 5; fallback: headed run + screen capture |
| jq foil looks like a strawman | Use the real jq for the same running example |
| Self-hosting demo picks a codec generator | Use `G_palette`/`G_toolbox` only (depth ceiling rejects the codec generators) |
