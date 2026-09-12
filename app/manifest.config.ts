import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

// This config runs in Node (imported by vite.config.ts); keep the declaration
// local so Node globals don't leak into the extension code's type space.
declare const process: { env: Record<string, string | undefined> }

// E2E-only build variant (`npm run build:e2e`): adds a host permission for the
// local fixture server so the automated Playwright harness can drive the popup
// as a regular tab. activeTab — the production mechanism — is only granted by
// a real toolbar-icon click, which no automation can produce; a host
// permission makes tab.url visible and chrome.scripting injectable through
// the exact same production code path. Production builds (`npm run build`)
// never include this — NFR-04's minimal-permissions manifest stays intact.
const e2eHostPermissions = process.env['TICKET2MD_E2E'] === '1'
  ? { host_permissions: ['http://127.0.0.1/*', 'http://localhost/*'] }
  : {}

export default defineManifest({
  ...e2eHostPermissions,
  manifest_version: 3,
  name: 'Ticket2MD',
  version: pkg.version,
  description: 'Export the open Jira ticket to a self-contained Markdown folder — locally, anonymized by default.',
  action: {
    default_popup: 'src/popup/index.html',
  },
  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
  permissions: ['activeTab', 'scripting', 'downloads'],
  // Public key that pins a deterministic extension id for unpacked loads, so the
  // Playwright E2E harness can address the popup at a stable
  // chrome-extension://<id>/ URL without a background service worker. This is a
  // public key only — no secret — and does not affect runtime behavior or
  // permissions (NFR-04). Id derived from it: jkkdkcmamdondchhjdnhdkocfchdlcjg.
  key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAq0Fy1flBR36V8qXg4Wb/RXY9lad8AjphaKZqGg1+ST6rj3vTI6ksGQdIIg8TIUS2il1s4G8PffZ9N226pg/DmaOIFMaMDOcgI4qMl58hb4q/wEdwSFqf4u0b+NoTTH3zkxy+BHqYMl+uuABJ9ez5fdR/AictHzoZHI0NNU8FcyBwk7a0h73Mcf0DhuBU/87DrTDrmWHIeR44+BDud9tg4B/nEvlsIA4I1yz/MtY+zj+RhQJnvTDCzyDsB9Sant4LBwpa+k3NdKunxx5qJrBqY8HfYpNgQEgHuQ2dMpMMNUB7Q97m0scn5Cuh24P2TFE09CgO2aE6FjG6T7YPqjnNRQIDAQAB',
})
