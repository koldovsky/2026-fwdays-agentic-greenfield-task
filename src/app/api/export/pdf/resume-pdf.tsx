// Server-side PDF renderer for the résumé export (FR-EXPORT-02). Lives beside
// its route rather than in shared/lib because @react-pdf/renderer is React/JSX
// (shared/lib is framework-free, TC-PURE-01). Registers PT Sans — a
// Cyrillic-complete TTF (regular + bold) bundled under /public — because the
// web UI's display font has no Cyrillic; this surface embeds its own so
// Ukrainian text renders (design.md §4). Font registration runs once at module
// load; the TTFs are traced into this route's serverless bundle via
// next.config.ts `outputFileTracingIncludes`.
import { join } from "node:path";
import { Document, Font, Page, StyleSheet, Text, renderToBuffer } from "@react-pdf/renderer";

import type { ExportDocument } from "@/entities/export-document";

// Absolute paths — react-pdf reads the TTFs from disk when it first lays out
// text. The files are traced into this route's serverless bundle (next.config).
const FONT_DIR = join(process.cwd(), "public", "fonts", "ptsans");
Font.register({
  family: "PT Sans",
  fonts: [
    { src: join(FONT_DIR, "PT_Sans-Web-Regular.ttf"), fontWeight: "normal" },
    { src: join(FONT_DIR, "PT_Sans-Web-Bold.ttf"), fontWeight: "bold" },
  ],
});

const styles = StyleSheet.create({
  page: { fontFamily: "PT Sans", paddingVertical: 56, paddingHorizontal: 48, fontSize: 11, color: "#16243d" },
  headline: { fontSize: 18, fontWeight: "bold", marginBottom: 20 },
  bullet: { marginBottom: 8, lineHeight: 1.4 },
  footer: { marginTop: 28, fontSize: 9, color: "#6b7280" },
});

function ResumePdf({ doc }: { doc: ExportDocument }) {
  return (
    <Document>
      <Page style={styles.page}>
        {doc.headline ? <Text style={styles.headline}>{doc.headline}</Text> : null}
        {doc.bullets.map((bullet, index) => (
          <Text key={index} style={styles.bullet}>
            {`•  ${bullet}`}
          </Text>
        ))}
        {doc.footer ? <Text style={styles.footer}>{doc.footer}</Text> : null}
      </Page>
    </Document>
  );
}

/** Render an ExportDocument to a PDF Buffer (Ukrainian-safe via PT Sans). */
export function renderResumePdf(doc: ExportDocument): Promise<Buffer> {
  return renderToBuffer(<ResumePdf doc={doc} />);
}
