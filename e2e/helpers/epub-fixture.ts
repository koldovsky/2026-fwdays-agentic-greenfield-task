// A tiny, transparent EPUB builder for the origin-isolation negative-security e2e (ADR-013) — kept as
// code (no committed binary) so the checker can read exactly what the "malicious" fixture contains.
//
// `buildSingleSpineXssEpub()` produces a valid STORE (uncompressed) ZIP with ONE spine document whose
// `<script>` tries to STEAL the app origin's connector credential and, when the browser's same-origin
// policy denies it, records the denial. Because the reader renders this on a SEPARATE origin, the spine
// document runs inside an iframe whose `window.top` is the (cross-origin) app — so it physically cannot
// reach the app's `localStorage`. The probe does NOT depend on any sanitiser: the engine is on a
// credential-free origin, so there is nothing reachable to steal regardless of what the script does.
//
// Origin chain in the reader: app (e.g. :5173, holds `edda.creds.*`) -> reader frame (:5174) -> this
// spine document (a :5174 blob, same-origin to the reader frame). So from the spine:
//   - `window.top`    = the app  (:5173) -> cross-origin -> localStorage access THROWS SecurityError.
//   - `window.parent` = the reader frame (:5174) -> same-origin, but holds no credential.
// The probe therefore targets `window.top` (the app, where the credential is) and records the blocked
// attempt in its OWN (:5174) origin, which the e2e reads back from the reader frame.

/** CRC-32 (IEEE 802.3) over a byte buffer — required so foliate's zip reader accepts each entry. */
function crc32(bytes: Uint8Array): number {
  let crc = ~0
  for (const byte of bytes) {
    crc ^= byte
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return ~crc >>> 0
}

interface ZipEntry {
  name: string
  data: Uint8Array
}

/** Assemble STORE-method ZIP bytes (no compression) from named entries. */
function storeZip(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder()
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const name = encoder.encode(entry.name)
    const crc = crc32(entry.data)
    const size = entry.data.length

    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true)
    local.setUint16(8, 0, true) // method: store
    local.setUint16(12, 0x21, true) // mod date 1980-01-01
    local.setUint32(14, crc, true)
    local.setUint32(18, size, true)
    local.setUint32(22, size, true)
    local.setUint16(26, name.length, true)
    const localBytes = new Uint8Array(local.buffer)
    parts.push(localBytes, name, entry.data)

    const dir = new DataView(new ArrayBuffer(46))
    dir.setUint32(0, 0x02014b50, true)
    dir.setUint16(4, 20, true)
    dir.setUint16(6, 20, true)
    dir.setUint16(10, 0, true) // method: store
    dir.setUint16(12, 0x21, true)
    dir.setUint32(16, crc, true)
    dir.setUint32(20, size, true)
    dir.setUint32(24, size, true)
    dir.setUint16(28, name.length, true)
    dir.setUint32(42, offset, true) // local header offset
    central.push(new Uint8Array(dir.buffer), name)

    offset += localBytes.length + name.length + size
  }

  const centralStart = offset
  const centralSize = central.reduce((sum, part) => sum + part.length, 0)

  const eocd = new DataView(new ArrayBuffer(22))
  eocd.setUint32(0, 0x06054b50, true)
  eocd.setUint16(8, entries.length, true)
  eocd.setUint16(10, entries.length, true)
  eocd.setUint32(12, centralSize, true)
  eocd.setUint32(16, centralStart, true)

  const all = [...parts, ...central, new Uint8Array(eocd.buffer)]
  const total = all.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let position = 0
  for (const part of all) {
    out.set(part, position)
    position += part.length
  }
  return out
}

const CONTAINER_XML = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`

const CONTENT_OPF = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">xss-origin-probe</dc:identifier>
    <dc:title>XSS Origin Probe</dc:title>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="c1" href="index.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="c1"/>
  </spine>
</package>`

/** The key the probe writes to the APP origin if it manages to steal (must stay UNSET — proves denial). */
export const XSS_STOLEN_KEY = 'STOLEN'
/** The key the probe writes to ITS OWN (reader-frame) origin after being blocked (proves execution). */
export const XSS_BLOCKED_KEY = 'BLOCKED'
/** The app-origin credential the probe tries to read + exfiltrate; must stay intact. */
export const XSS_CREDS_KEY = 'edda.creds.probe'
/** The credential value seeded on the app origin. */
export const XSS_CREDS_VALUE = 'SECRET-CONNECTOR-TOKEN'

// The single spine document. Its <script> runs in foliate's `allow-same-origin allow-scripts` iframe —
// scripts DO execute (so this is a real test of the boundary, not a dead frame). It reaches for the app
// origin via `window.top`; the same-origin policy denies it; it records the SecurityError in its own
// origin so the e2e can confirm the script ran AND was blocked.
const INDEX_XHTML = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Origin Probe</title></head>
<body>
  <p>single-spine-origin-probe-rendered</p>
  <script>
  (function () {
    try {
      // window.top is the APP origin (cross-origin to this reader frame). Reading or writing its
      // localStorage is denied by the same-origin policy, so the connector credential cannot be stolen.
      var appStore = window.top.localStorage;
      var stolen = appStore.getItem('${XSS_CREDS_KEY}') || 'yes';
      appStore.setItem('${XSS_STOLEN_KEY}', stolen);
    } catch (e) {
      // Blocked. Record the failure in OUR OWN (reader-frame) origin so the test can read it back.
      try { localStorage.setItem('${XSS_BLOCKED_KEY}', 'blocked-' + e.name); } catch (e2) {}
    }
  })();
  </script>
</body>
</html>`

/** Build a valid single-spine EPUB whose one spine document tries to steal the app's credential. */
export function buildSingleSpineXssEpub(): Uint8Array {
  const encoder = new TextEncoder()
  return storeZip([
    { name: 'mimetype', data: encoder.encode('application/epub+zip') },
    { name: 'META-INF/container.xml', data: encoder.encode(CONTAINER_XML) },
    { name: 'OEBPS/content.opf', data: encoder.encode(CONTENT_OPF) },
    { name: 'OEBPS/index.xhtml', data: encoder.encode(INDEX_XHTML) },
  ])
}
