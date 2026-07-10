# Demo video pipeline (code-authored)

The submission demo is generated from code, not hand-edited: **Playwright** drives
the real app and records the product walkthrough, then **Remotion** composes a
title card + that clip + practice slides into `out/final.mp4`. Re-run any time.

```
Playwright  e2e/demo.spec.ts ──▶ test-results/**/video.webm
   yarn demo:capture                     │  yarn demo:convert (ffmpeg)
                                         ▼
Remotion  remotion/  ◀── public/demo.mp4
   yarn demo:render ──▶ out/final.mp4
```

## One-time setup

```bash
yarn                       # deps already in package.json (@playwright/test, remotion)
npx playwright install chromium   # the browser Playwright drives
brew install ffmpeg        # webm → mp4 transcode (or any ffmpeg install)
```

The app must be runnable locally, because Playwright server-renders it:

- a `.env` with `DATABASE_URL`, `CV_ENCRYPTION_KEY`, `AUTH_SECRET` (see the README
  deploy section / `.env.example`);
- a database — `yarn dev:db` (pglite) in another terminal, then `yarn db:migrate`.

## Capture the product demo

Two modes (both drive the real UI at `/tailor`; anonymous can run one free
tailoring, FR-ONBOARD-01):

```bash
# REAL pipeline — needs ANTHROPIC_API_KEY in .env; correct types, real spend, slower
yarn demo:capture

# MOCKED pipeline — canned NDJSON, fast, deterministic, no key / no spend
DEMO_MOCK=1 yarn demo:capture
```

`e2e/demo.spec.ts` fills the CV + JD, runs analyze → generate, and paints an
on-screen caption bar narrating each beat, at 1920×1080 with `slowMo` for a
readable pace. Output: `test-results/**/video.webm`.

> If a `DEMO_MOCK=1` render looks empty, the app's response types drifted from the
> canned `MOCK_ANALYSIS` / `MOCK_RESULT` fixtures — reconcile them against the real
> `AnalysisResult` / `TailoringRunResult` / `ChecklistRow` / `Bullet` shapes in
> `features/run-tailoring` + `widgets/checklist-panel`, or just use the REAL mode.
> The generate-step trigger is clicked best-effort (several candidate labels); if
> your build uses a different label, add it to `genNames` in the spec.

## Assemble the video

```bash
yarn demo:convert          # newest .webm → public/demo.mp4 (ffmpeg)
yarn demo:studio           # optional: preview/scrub in the Remotion studio
yarn demo:render           # → out/final.mp4  (1080p, 30fps)
# or the whole chain:
yarn demo                  # capture → convert → render
```

Remotion (`remotion/`) auto-fits the timeline to the captured clip length
(`Root.tsx` probes `public/demo.mp4`). Edit the copy in `remotion/scenes/*` — the
`Title` (idea), `Practices` (context / SDD / maker≠checker / verification slides,
each citing a committed artifact) and `Close` (self-audit → harden-agentic-loop).

## Narration / voiceover

The captured clip carries on-screen captions, so it reads silently. To add a
voiceover:

- record live over `out/final.mp4`, or
- generate one with **ElevenLabs** (Ukrainian supported) from the caption script
  and drop it as an `<Audio>` track in a Remotion scene, or
- finish in **Descript** (drop `public/demo.mp4` + slides, transcript-edit,
  Overdub VO, auto-captions, export).

Course note: narrating in **Ukrainian** likely scores better (the product UI and
CodeRabbit reviews are UA-first). Keep the whole thing under the 5-minute ceiling
(1–2 min is acceptable per the README).
