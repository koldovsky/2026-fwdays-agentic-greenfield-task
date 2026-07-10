# Tech context

## Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js **16.2** App Router, React **19** |
| Language | TypeScript strict |
| Styling | Tailwind 4, shadcn/ui base-nova |
| Map | Leaflet + react-leaflet, OSM tiles |
| Charts | Recharts (dynamic import for bundle size) |
| Data APIs | Open-Meteo forecast + geocoding (keyless) |
| Tests | Vitest (unit), Playwright (E2E + demo recordings) |
| Specs | OpenSpec (`openspec/specs/`, `openspec/changes/`) |
| CI | GitHub Actions — full history checkout on PR/push |

## Repository commands

```bash
npm install
npm run dev          # local dev server
npm run lint
npm run test:run     # 50 unit tests
npm run build
npx @fission-ai/openspec@latest validate --all --strict
npm run check:trace
npm run check:recordings
npm run qa:verify    # full QA gate bundle (when evidence exists)
npm run qa:record-demos  # regenerate Playwright demo clips
npm run qa:record-homework   # homework video (~90 s)
npm run qa:mux-homework-voice  # voice + mux only (keeps existing .webm)
```

CI note: `.github/workflows/ci.yml` uses `fetch-depth: 0` — required for `check-trajectory.mjs` (`git log --all` for `Slice:` trailers).

## Environments

| Environment | Notes |
|-------------|--------|
| Local | `npm run dev` → http://localhost:3000; no API keys required |
| CI | lint + test + build + OpenSpec validate on push/PR |

## Conventions worth memorizing

- **Pure logic:** `lib/<domain>/` + colocated `*.test.ts` with `// @trace FR-x`
- **UI strings:** `lib/i18n/uk.ts` (+ `en.ts`) — Ukrainian-first
- **Pages:** thin server components; client only for map, animations, search
- **Next.js docs:** read `node_modules/next/dist/docs/` — training data may be stale
- **Commits** touching `app/`, `lib/`, `db/`, `src/` need trace trailer (`Refs:`, `Slice:`)

## Pointers

- Module conventions: `AGENTS.md` § Stack & module conventions
- Context architecture (static vs dynamic): `docs/context-architecture.md`
- Eval layer: `evals/README.md`
