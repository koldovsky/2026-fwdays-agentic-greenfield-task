# Demo presentation — TinyStart (fully automated)

Agent-generated demo video with synced macOS TTS narration + Playwright screen capture.

## One command

```bash
npm start                                    # terminal 1 — production server
npm run demo:video                           # terminal 2 — full pipeline
```

Output: **`demo_presentation/tinystart-demo.mp4`** (video + audio, ≤2:00)

## Pipeline

| Step | Tool | Output |
|------|------|--------|
| 1 | `narration.json` | Segment script (product + agentic) |
| 2 | macOS `say` + ffmpeg | `work/audio/narration.m4a` |
| 3 | Playwright (headless) | `work/screen.webm` — timed to narration |
| 4 | ffmpeg-static | `tinystart-demo.mp4` |

## Customize narration

Edit `narration.json` — each segment has `text`, `pauseAfterMs`, and `phase` (`product` | `agentic`).

Regenerate:

```bash
npm run demo:video
```

## Homework artifacts

| File | Purpose |
|------|---------|
| `tinystart-demo.mp4` | Submit this video (or upload to Loom/YouTube) |
| `PR_DESCRIPTION.md` | PR body draft |
| `REHEARSAL_CHECKLIST.md` | FR-ID map (reference) |

## Requirements

- macOS `say` (built-in TTS)
- `ffmpeg-static` (npm devDependency)
- App running at `http://localhost:3000`
- NFR-DX-01 gate green before recording

## Legacy

`record-demo.mjs` — silent webm only; superseded by `build-demo-video.mjs`.
