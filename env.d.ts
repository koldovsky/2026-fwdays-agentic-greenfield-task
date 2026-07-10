/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Reader origin isolation (ADR-013). The reader frame is served from a SEPARATE origin, configured here.
// Both are optional so a missing value is a typed `string | undefined` the code must handle by FAILING
// CLOSED (the app proxy throws "Reader origin is not configured"; the frame binds to nothing) — never by
// silently falling back to same-origin rendering. Dev/e2e defaults live in `.env.development`.
interface ImportMetaEnv {
  /** The reader-frame origin the app points its cross-origin `<iframe>` at (e.g. http://localhost:5174). */
  readonly VITE_READER_ORIGIN?: string
  /** The app origin the reader frame validates its init handshake against (e.g. http://localhost:5173). */
  readonly VITE_APP_ORIGIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
