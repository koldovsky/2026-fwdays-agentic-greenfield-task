// Server-side PDF renderer for the GDPR account data export (NFR-GDPR-01).
// Mirrors resume-pdf.tsx and cover-letter-pdf.tsx: @react-pdf/renderer with
// React/JSX lives beside its route (not in framework-free shared/lib — TC-PURE-01)
// and embeds the same Cyrillic-complete PT Sans TTFs so Ukrainian text renders.
// The route's serverless function ships the fonts via outputFileTracingIncludes
// in next.config.ts (same entry pattern as the other two PDF routes).
import { join } from "node:path";
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

import type { AccountExport } from "@/shared/lib/account";

const FONT_DIR = join(process.cwd(), "public", "fonts", "ptsans");
Font.register({
  family: "PT Sans",
  fonts: [
    { src: join(FONT_DIR, "PT_Sans-Web-Regular.ttf"), fontWeight: "normal" },
    { src: join(FONT_DIR, "PT_Sans-Web-Bold.ttf"), fontWeight: "bold" },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "PT Sans",
    paddingVertical: 56,
    paddingHorizontal: 48,
    fontSize: 11,
    color: "#16243d",
  },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  exportedAt: { fontSize: 9, color: "#6b7280", marginBottom: 24 },
  sectionHeading: {
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 8,
    borderBottomColor: "#e5e7eb",
    borderBottomWidth: 1,
    paddingBottom: 4,
  },
  row: { marginBottom: 5, flexDirection: "row" },
  label: { fontWeight: "bold", width: 120, flexShrink: 0 },
  value: { flex: 1, lineHeight: 1.4 },
  subsectionHeading: { fontWeight: "bold", marginTop: 12, marginBottom: 4 },
  indented: { marginLeft: 16, marginBottom: 4, lineHeight: 1.4 },
  rawBlock: {
    marginTop: 6,
    marginLeft: 16,
    fontSize: 9,
    color: "#374151",
    lineHeight: 1.5,
    // Limit very long raw texts to be readable without truncation
  },
  placeholder: { marginLeft: 16, fontSize: 10, color: "#9ca3af", fontStyle: "italic" },
  footer: { marginTop: 32, fontSize: 9, color: "#6b7280" },
});

// ---- Section: Account ---------------------------------------------------

function AccountSection({ user }: { user: AccountExport["user"] }) {
  const name = user.name ?? "—";
  const email = user.email ?? "—";
  const created = formatDate(user.createdAt);
  return (
    <>
      <Text style={styles.sectionHeading}>Account</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Account ID</Text>
        <Text style={styles.value}>{user.id}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{name}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{email}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Account created</Text>
        <Text style={styles.value}>{created}</Text>
      </View>
    </>
  );
}

// ---- Section: CV Profiles -----------------------------------------------

function CvProfilesSection({ profiles }: { profiles: AccountExport["cvProfiles"] }) {
  if (profiles.length === 0) {
    return (
      <>
        <Text style={styles.sectionHeading}>CV Profiles</Text>
        <Text style={styles.placeholder}>No CV profiles stored.</Text>
      </>
    );
  }
  return (
    <>
      <Text style={styles.sectionHeading}>CV Profiles</Text>
      {profiles.map((p, i) => (
        <View key={`cv-${i}`}>
          <Text style={styles.subsectionHeading}>
            {`Profile ${i + 1}  —  ${formatDate(p.createdAt)}`}
          </Text>

          {/* Structured fields from the parsed CvProfile (skills + sentences) */}
          {p.profile.skills && p.profile.skills.length > 0 ? (
            <View style={styles.row}>
              <Text style={styles.label}>Skills</Text>
              <Text style={styles.value}>{p.profile.skills.join(", ")}</Text>
            </View>
          ) : null}

          {/* Raw CV text block — the subject's own data (NFR-GDPR-01).
              When decryption failed we render a clear placeholder rather than
              omitting the profile or surfacing an error code (NFR-OBS-01). */}
          {p.decryptionFailed === true ? (
            <Text style={styles.placeholder}>
              Raw CV text could not be decrypted (key may have been rotated). Structured profile
              data above is intact.
            </Text>
          ) : p.rawText ? (
            <>
              <Text style={[styles.label, { marginTop: 6 }]}>Raw CV text</Text>
              <Text style={styles.rawBlock}>{p.rawText}</Text>
            </>
          ) : null}
        </View>
      ))}
    </>
  );
}

// ---- Section: Tailoring History -----------------------------------------

/**
 * The `tailorings` field on AccountExport is `readonly unknown[]` (the service
 * returns the full DB row shapes). We extract only the display-safe, non-PII
 * fields (jobTitle, matchScore, createdAt, status) via a runtime guard so this
 * renderer remains forward-compatible if the row shape grows. CV text / user
 * IDs are NEVER read here (NFR-SEC-01/02).
 */
interface TailoringDisplayRow {
  jobTitle: string | null;
  matchScore: number | null;
  createdAt: string;
  status?: string;
}

function asTailoringRow(raw: unknown): TailoringDisplayRow | null {
  if (raw === null || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  // Guard: at minimum we need a createdAt to be useful
  if (typeof r["createdAt"] !== "string") return null;
  return {
    jobTitle: typeof r["jobTitle"] === "string" ? r["jobTitle"] : null,
    matchScore:
      typeof r["matchScore"] === "number"
        ? r["matchScore"]
        : r["matchScore"] === null
          ? null
          : null,
    createdAt: r["createdAt"],
    status: typeof r["status"] === "string" ? r["status"] : undefined,
  };
}

function TailoringHistorySection({ tailorings }: { tailorings: AccountExport["tailorings"] }) {
  const rows = tailorings.map(asTailoringRow).filter((r): r is TailoringDisplayRow => r !== null);

  if (rows.length === 0) {
    return (
      <>
        <Text style={styles.sectionHeading}>Tailoring History</Text>
        <Text style={styles.placeholder}>No tailorings stored.</Text>
      </>
    );
  }

  return (
    <>
      <Text style={styles.sectionHeading}>Tailoring History</Text>
      {rows.map((row, i) => (
        <View key={`tail-${i}`} style={{ marginBottom: 10 }}>
          <View style={styles.row}>
            <Text style={styles.label}>Job title</Text>
            <Text style={styles.value}>{row.jobTitle ?? "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Match score</Text>
            <Text style={styles.value}>
              {row.matchScore !== null ? `${row.matchScore} / 100` : "—"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{formatDate(row.createdAt)}</Text>
          </View>
          {row.status ? (
            <View style={styles.row}>
              <Text style={styles.label}>Status</Text>
              <Text style={styles.value}>{row.status}</Text>
            </View>
          ) : null}
        </View>
      ))}
    </>
  );
}

// ---- Root document -------------------------------------------------------

function AccountExportPdf({ data }: { data: AccountExport }) {
  const exportedAt = formatDate(data.exportedAt);
  return (
    <Document>
      <Page style={styles.page}>
        <Text style={styles.title}>Vouch — Your Data Export</Text>
        <Text style={styles.exportedAt}>{`Exported ${exportedAt}`}</Text>

        <AccountSection user={data.user} />
        <CvProfilesSection profiles={data.cvProfiles} />
        <TailoringHistorySection tailorings={data.tailorings} />

        <Text style={styles.footer}>
          {`Vouch — honest-resume.com  |  This export contains all data we hold for your account as of ${exportedAt}.`}
        </Text>
      </Page>
    </Document>
  );
}

// ---- Helpers -------------------------------------------------------------

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

// ---- Export -------------------------------------------------------------

/** Render an AccountExport to a PDF Buffer (Cyrillic-safe via PT Sans). */
export function renderAccountExportPdf(data: AccountExport): Promise<Buffer> {
  return renderToBuffer(<AccountExportPdf data={data} />);
}
