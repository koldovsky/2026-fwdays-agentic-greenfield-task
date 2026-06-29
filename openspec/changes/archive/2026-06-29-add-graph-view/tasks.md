## 1. Graph data

- [x] 1.1 Add `lib/content/graph.ts` `buildGraph()` (undirected book edges from note links; skip self/broken; only connected books) + test
- [x] 1.2 Add `coverSolid()` to `components/cover.ts`

## 2. Graph page

- [x] 2.1 Add `app/graph/page.tsx` — SVG chord diagram (nodes on a circle, curved edges, labels, nodes link to books) + empty state
- [x] 2.2 Add a "Graph" link to the shelf header

## 3. Verify

- [x] 3.1 `npm test` (66) green; `npx tsc --noEmit` clean; `npm run build` green (`/graph` route)
- [x] 3.2 Playwright: `/graph` renders 50 nodes + 52 edges for the seeded library
