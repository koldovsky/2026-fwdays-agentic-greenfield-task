/// <reference lib="webworker" />
export {}

// Service worker: precache the app shell only; runtime-cache plugin chunks.
// Book bytes bypass the SW entirely (ADR-005) — Workbox cannot cache a 206 byte-range correctly,
// so we never intercept byte/range routes here (see shouldBypassSW).

import { shouldBypassSW } from './src/app/sw-bypass'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: { url: string; revision: string | null }[]
}

const SHELL_CACHE = 'edda-shell-v1'
const shellAssets = self.__WB_MANIFEST.map((entry) => entry.url)

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(shellAssets)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key))),
      ),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  // ADR-005: range/206 book bytes, non-GET, and cross-origin requests never touch the SW.
  if (shouldBypassSW(request, self.location.origin)) return

  event.respondWith(respondFromShell(request))
})

// Cache-first against the precached shell; navigations fall back to the precached index so the
// installed PWA renders offline after one visit.
async function respondFromShell(request: Request): Promise<Response> {
  const cached = await caches.match(request)
  if (cached) return cached

  if (request.mode === 'navigate') {
    const shell = await caches.match('/index.html')
    if (shell) return shell
  }

  return fetch(request)
}
