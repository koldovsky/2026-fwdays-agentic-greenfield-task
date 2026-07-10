// Entry point of the reader-frame document (ADR-013) — the page served from the SEPARATE reader origin
// (`VITE_READER_ORIGIN`) and embedded by the app as a cross-origin `<iframe>`. It does the minimum: find
// the mount node and start the bridge harness, which waits for the app's validated init handshake before
// touching any book bytes. No app code, no credentials, and no network I/O live on this origin's page.

import { startReaderFrame } from './harness'

const mount = document.getElementById('reader-mount')
if (mount) startReaderFrame(mount)
