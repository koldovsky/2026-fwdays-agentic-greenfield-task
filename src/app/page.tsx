import type { Metadata } from "next";
import { cookies } from "next/headers";
import { siteDescription, siteKeywords } from "@/shared/config";
import { LOCALE_COOKIE, parseLocale } from "@/shared/lib/i18n";
import { Landing } from "@/views/landing";

// Home = public marketing landing. Canonical + OG resolved against metadataBase
// set in layout.tsx. Static, prerendered — no data fetch on load (FR-SALES-01).
export const metadata: Metadata = {
  title: "Vouch — Honest Resume Tailor",
  description: siteDescription,
  keywords: [...siteKeywords],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Vouch — Honest Resume Tailor",
    description: siteDescription,
    url: "/",
    type: "website",
  },
};

export default async function Home() {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return <Landing locale={locale} />;
}
