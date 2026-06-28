import type {
  PrecacheEntry,
  RuntimeCaching,
  SerwistGlobalConfig,
} from "serwist";
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

// Service worker source compiled by Serwist at build time. Scope is deliberately
// narrow: precache the app shell for offline use (FR-PWA-02) and runtime-cache
// static assets with simple strategies. It registers NO push or background-sync
// handlers (we intentionally avoid `defaultCache`, which queues via the Background
// Sync API), so nothing runs while the app is closed (FR-PWA-03).

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Injected by Serwist: the precache manifest (the app shell).
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const runtimeCaching: RuntimeCaching[] = [
  {
    matcher: ({ request }) => request.mode === "navigate",
    handler: new NetworkFirst({ cacheName: "pages" }),
  },
  {
    matcher: ({ request }) =>
      ["style", "script", "worker", "font"].includes(request.destination),
    handler: new StaleWhileRevalidate({ cacheName: "assets" }),
  },
  {
    matcher: ({ request }) => request.destination === "image",
    handler: new CacheFirst({
      cacheName: "images",
      plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 2_592_000 })],
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
});

serwist.addEventListeners();
