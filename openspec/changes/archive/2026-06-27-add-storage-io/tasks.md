## 1. Paths

- [x] 1.1 Write a failing test `lib/content/paths.test.ts` covering `contentRoot()` (env override + cwd fallback) and the path builders (`booksDir`, `bookDir`, `bookFile`, `notesDir`, `noteFile`)
- [x] 1.2 Run the test — confirm it fails (module missing)
- [x] 1.3 Implement `lib/content/paths.ts` to satisfy the test
- [x] 1.4 Run the test — confirm it passes

## 2. Filesystem utilities

- [x] 2.1 Write a failing test `lib/content/fs-utils.test.ts` using a temp dir: `atomicWrite` (creates parents, overwrites, leaves no temp file), `readFileOr` (contents vs fallback), `listDirs`/`listFiles` (empty for missing dir, filters by kind)
- [x] 2.2 Run the test — confirm it fails (module missing)
- [x] 2.3 Implement `lib/content/fs-utils.ts`: `atomicWrite` (temp-in-same-dir + rename, `mkdir -p` parent), `readFileOr` (ENOENT → fallback, else rethrow), `listDirs`, `listFiles`
- [x] 2.4 Run the test — confirm it passes

## 3. Verify

- [x] 3.1 Run the full test suite — all green
- [x] 3.2 Confirm no module outside this capability imports `node:fs` directly (fs-isolation boundary holds)
- [x] 3.3 Capability complete (project is local-only / no git — no commit step)
