<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Bye Binge — Agent Guide

**What this is:** A mobile-first PWA for emotional eating crisis intervention. Users hit a persistent red STOP button, walk through the STEPP reflection wizard, and log binge-free progress. The entire UI morphs vocabulary and tone via three Tone Modes.

## Stack

- **Next.js 16** / **React 19** / **TypeScript** — App Router, `app/` directory
- **Zustand 5** — client state (`store/`)
- **Tailwind CSS 4** — utility-first styling
- **Vitest** — unit tests (`__tests__/`, `lib/**/*.test.ts`)

## Key directories

| Path | Purpose |
|------|---------|
| `app/` | Next.js App Router pages and root layout |
| `components/emergency-intercept/` | STOP button, modal, STEPP wizard (3 phases), grounding summary |
| `components/dashboard/` | Metrics panel, story carousel, top-tasks panel |
| `components/progress-logging/` | Daily check-in, wins list, success story form |
| `store/` | Zustand stores: `emergency-intercept.ts`, `progress-logging.ts`, `tone-engine.ts` |
| `lib/` | Hooks and pure logic mirroring `components/` feature folders |
| `openspec/` | Change specs and design tasks (source of truth for planned work) |
| `docs/` | Product brief, requirements, design system |

## Tone Modes

All copy is tone-adaptive. Never hardcode user-facing strings — use the copy helpers in `lib/<feature>/copy.ts` or `use-<feature>-copy` hooks that resolve text from the active `ToneMode` (`calm` | `rational` | `high-impact`).

| Mode | Voice |
|------|-------|
| `calm` (Zen Sanctuary) | Warm, no exclamation marks |
| `rational` (Blueprint) | Clinical, data-framing |
| `high-impact` (Indian Auntie) | Tough love, exclamations unlocked |

## Rules

- **Read `node_modules/next/dist/docs/` first** before touching routing, data fetching, or middleware — Next.js 16 has breaking changes from 14/15.
- STOP button color (`#C13515`) is **mode-invariant** — never theme it.
- Tone punctuation: zero `!` in `calm`, fully allowed in `high-impact`.
- Touch targets ≥ 44px; base spacing unit is 4px.
- Tests live in `__tests__/<feature>/` or co-located as `*.test.ts`; run with `npm test`.
- `openspec/changes/` tracks in-flight work — check it before starting new features.
