import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'

// Edda — reader-frame build (ADR-013). A SECOND, separate Vite entry whose document is served from the
// reader origin (dev/e2e: a second port = a different origin than the app). It hosts the foliate engine
// behind the app<->frame postMessage bridge so untrusted book content runs on an origin that physically
// cannot reach the app's `edda.creds.*`. NO PWA / service worker here: book bytes bypass the SW (ADR-005)
// and arrive over the bridge as a Transferable; the frame performs no network I/O of its own.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  // The frame validates the init handshake against VITE_APP_ORIGIN (modern-web-guidance §1.5). In
  // DEVELOPMENT (and e2e via `pnpm dev:frame`) default it to the app's port; production self-hosters set
  // it. Unset ⇒ the frame accepts no handshake at all (fail closed).
  const define: Record<string, string> = {}
  if (!env.VITE_APP_ORIGIN && mode === 'development') {
    define['import.meta.env.VITE_APP_ORIGIN'] = JSON.stringify('http://localhost:5173')
  }
  return {
    root: fileURLToPath(new URL('./src/platform/web/reader-frame', import.meta.url)),
    // A SEPARATE dep-optimizer cache from the app build. The app (`pnpm dev`) and this frame
    // (`pnpm dev:frame`) run SIMULTANEOUSLY (ADR-013: the app embeds the cross-origin frame), and both
    // default to `<root>/node_modules/.vite`. Sharing it makes each server's optimize pass clobber the
    // other's pre-bundled deps + browserHash, so the app then 504s ("Outdated Optimize Dep") on `vue`/
    // `pinia`. A dedicated cacheDir keeps the two pre-bundle sets independent. (Gitignored; dev-only.)
    cacheDir: fileURLToPath(new URL('./node_modules/.vite-frame', import.meta.url)),
    define,
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        // Vendored foliate-js engine (pinned git submodule, ADR-002), shared with the main build.
        'foliate-js': fileURLToPath(new URL('./vendor/foliate-js', import.meta.url)),
      },
    },
    build: {
      outDir: fileURLToPath(new URL('./dist-frame', import.meta.url)),
      emptyOutDir: true,
    },
    server: { port: 5174, strictPort: true },
    preview: { port: 5174, strictPort: true },
  }
})
