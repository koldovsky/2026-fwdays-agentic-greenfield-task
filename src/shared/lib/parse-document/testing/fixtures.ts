// Tiny real document fixtures for parse-document tests (add-upload-cv task
// 1.3). Hand-assembled, dependency-free builders: a minimal single-page PDF
// (correct xref offsets) and a minimal DOCX (stored zip, hand-built local
// headers + central directory). Test-only — never imported by product code
// (shared/lib/llm/testing precedent).

/** Escape the three characters PDF literal strings reserve. */
function escapePdfText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/**
 * A minimal valid one-page PDF. With `text` (ASCII — the built-in Helvetica
 * WinAnsi encoding has no Cyrillic) the page draws it; with `null` the page
 * has an empty content stream — a stand-in for a scanned/image-only CV that
 * parses fine but yields no text.
 */
export function pdfFixture(text: string | null): Buffer {
  const content =
    text === null ? "" : `BT /F1 12 Tf 72 720 Td (${escapePdfText(text)}) Tj ET`;

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R " +
      "/Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = body.length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  const trailer =
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n` +
    `startxref\n${xrefOffset}\n%%EOF\n`;

  // Fixture text is ASCII-only, so string length === byte length above.
  return Buffer.from(body + xref + trailer, "latin1");
}

// --- Minimal DOCX (stored zip) ---------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number): Buffer {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function u32(value: number): Buffer {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

interface ZipEntry {
  readonly name: string;
  readonly data: string;
}

/** Assemble a stored (uncompressed) zip — enough for mammoth's unzipper. */
function buildZip(entries: readonly ZipEntry[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const data = Buffer.from(entry.data, "utf8");
    const crc = crc32(data);
    const common = Buffer.concat([
      u16(20), // version needed
      u16(0), // flags
      u16(0), // method: stored
      u16(0), // mod time
      u16(0), // mod date
      u32(crc),
      u32(data.length), // compressed size (== uncompressed, stored)
      u32(data.length),
      u16(name.length),
      u16(0), // extra length
    ]);
    const local = Buffer.concat([u32(0x04034b50), common, name, data]);
    const central = Buffer.concat([
      u32(0x02014b50),
      u16(20), // version made by
      common,
      u16(0), // comment length
      u16(0), // disk number
      u16(0), // internal attrs
      u32(0), // external attrs
      u32(offset), // local header offset
      name,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }

  const centralDirectory = Buffer.concat(centrals);
  const endOfCentralDirectory = Buffer.concat([
    u32(0x06054b50),
    u16(0), // disk number
    u16(0), // central directory start disk
    u16(entries.length),
    u16(entries.length),
    u32(centralDirectory.length),
    u32(offset), // central directory offset
    u16(0), // comment length
  ]);

  return Buffer.concat([...locals, centralDirectory, endOfCentralDirectory]);
}

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * A minimal valid DOCX: [Content_Types].xml + _rels/.rels + word/document.xml
 * carrying one paragraph. UTF-8 throughout, so Ukrainian text round-trips.
 */
export function docxFixture(text: string): Buffer {
  return buildZip([
    {
      name: "[Content_Types].xml",
      data:
        `${XML_DECLARATION}\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        "</Types>",
    },
    {
      name: "_rels/.rels",
      data:
        `${XML_DECLARATION}\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        "</Relationships>",
    },
    {
      name: "word/document.xml",
      data:
        `${XML_DECLARATION}\n<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
        `<w:body><w:p><w:r><w:t>${escapeXml(text)}</w:t></w:r></w:p></w:body></w:document>`,
    },
  ]);
}
