// Server-side PDF renderer for the cover-letter export (add-tailoring-intelligence
// §4). Mirrors resume-pdf.tsx: @react-pdf/renderer (React/JSX, so it lives beside
// its route, not in framework-free shared/lib — TC-PURE-01) with the same
// Cyrillic-complete PT Sans embed so Ukrainian prose renders (design.md §4). It
// renders the coverLetter block's paragraphs as prose (no bullet prefix) plus the
// optional headline and the free-tier footer (FR-EXPORT-04).
import { join } from "node:path";
import { Document, Font, Page, StyleSheet, Text, renderToBuffer } from "@react-pdf/renderer";

import type { ExportDocument } from "@/entities/export-document";

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
  paragraph: { marginBottom: 12, lineHeight: 1.5 },
  footer: { marginTop: 28, fontSize: 9, color: "#6b7280" },
});

function CoverLetterPdf({ doc }: { doc: ExportDocument }) {
  const paragraphs = doc.coverLetter?.paragraphs ?? [];
  return (
    <Document>
      <Page style={styles.page}>
        {doc.headline ? <Text style={styles.headline}>{doc.headline}</Text> : null}
        {paragraphs.map((paragraph, index) => (
          <Text key={index} style={styles.paragraph}>
            {paragraph}
          </Text>
        ))}
        {doc.footer ? <Text style={styles.footer}>{doc.footer}</Text> : null}
      </Page>
    </Document>
  );
}

/** Render a cover-letter ExportDocument to a PDF Buffer (Ukrainian-safe via PT Sans). */
export function renderCoverLetterPdf(doc: ExportDocument): Promise<Buffer> {
  return renderToBuffer(<CoverLetterPdf doc={doc} />);
}
