import type { ManifestOptions } from 'vite-plugin-pwa'

/**
 * Installable PWA web manifest — the single source of truth for the app-shell.
 * Imported by `vite.config.ts` (the build feeds it to vite-plugin-pwa) and by unit
 * tests (hermetic: asserts this object directly, with no dependency on `pnpm build`
 * or a `dist/` artifact). theme/background = parchment canvas `#F0EEE9` (design token).
 */
export const pwaManifest: Partial<ManifestOptions> = {
  name: 'Edda',
  short_name: 'Edda',
  description: 'A self-hosted-library e-reader. Offline-first PWA.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: '#F0EEE9',
  theme_color: '#F0EEE9',
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    {
      src: '/icons/icon-512-maskable.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
}
