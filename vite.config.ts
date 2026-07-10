import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { pwaManifest } from './src/app/pwa-manifest'

// Edda — web build.
// PWA uses injectManifest so we own sw.ts (precache the shell only; book bytes bypass the SW — ADR-005).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  // ADR-013: the app points its cross-origin reader `<iframe>` at VITE_READER_ORIGIN. In DEVELOPMENT
  // (and e2e via `pnpm dev`) default it to the reader-frame's port so the whole pipeline runs locally.
  // In production it is UNSET unless a self-hoster configures it, so the reader fails closed (never
  // same-origin). In `test` mode (vitest) it stays unset, exercising that fail-closed path.
  const define: Record<string, string> = {}
  if (!env.VITE_READER_ORIGIN && mode === 'development') {
    define['import.meta.env.VITE_READER_ORIGIN'] = JSON.stringify('http://localhost:5174')
  }
  return {
    define,
    plugins: [
      vue(),
      tailwindcss(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: '.',
        filename: 'sw.ts',
        injectRegister: 'auto',
        devOptions: { enabled: false },
        includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
        manifest: pwaManifest,
        // Precache the shell incl. self-hosted fonts (woff2) + icons so the PWA renders fully offline.
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,woff2,svg,png,ico,webp}'],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        // Vendored foliate-js engine (pinned git submodule, ADR-002). Reached ONLY via dynamic
        // import() from the EPUB plugin so it stays a code-split chunk out of the initial bundle.
        'foliate-js': fileURLToPath(new URL('./vendor/foliate-js', import.meta.url)),
      },
    },
    // pdfjs-dist (the already-bundled ESM the PDF plugin lazy-imports) is INCOMPATIBLE with Vite's dep
    // optimizer — including it makes the optimizer fail to emit the dep, and the first in-browser import
    // 504s. Exclude it so Vite serves its ESM as-is (no optimization), which the install-on-demand
    // `import('./pdf-engine')` then resolves cleanly with no re-optimize/reload race.
    optimizeDeps: {
      exclude: ['pdfjs-dist'],
    },
    test: {
      environment: 'jsdom',
      globals: true,
      include: ['src/**/*.{test,spec}.ts'],
    },
  }
})
