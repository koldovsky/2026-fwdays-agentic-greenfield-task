import type { Metadata } from "next";
import { siteDescription, siteKeywords } from "@/shared/config";
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

export default function Home() {
  return <Landing />;
}
