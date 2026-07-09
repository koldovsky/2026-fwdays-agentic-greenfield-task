import type { Metadata } from "next";
import { Golos_Text, Unbounded } from "next/font/google";
import { cookies } from "next/headers";
import { siteDescription, siteName, siteUrl } from "@/shared/config";
import { HTML_LANG, LOCALE_COOKIE, parseLocale } from "@/shared/lib/i18n";
import "./globals.css";
import { Providers } from "./providers";

// Ukrainian-first (NFR-I18N-01): display + body faces include a Cyrillic subset so
// Ukrainian renders on-brand, not in a latin-only fallback (add-language-toggle).
// Weights pinned to those actually used (Tailwind font-normal/medium/semibold/
// bold) so the variable-axis payload stays lean against the LCP budget
// (NFR-PERF-04). Display only ever renders semibold/bold.
const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
  weight: ["600", "700"],
  display: "swap",
});

const golos = Golos_Text({
  variable: "--font-golos",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Vouch — Honest Resume Tailor",
    template: "%s — Vouch",
  },
  description: siteDescription,
  applicationName: siteName,
  authors: [{ name: siteName }],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    siteName,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vouch — Honest Resume Tailor",
    description: siteDescription,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Ukrainian-first (NFR-I18N-01): resolve the visitor locale from the cookie so
  // <html lang> is correct. Reading the cookie opts routes into dynamic rendering
  // (the accepted cost of cookie-based i18n without URL prefixes).
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return (
    <html
      lang={HTML_LANG[locale]}
      className={`${unbounded.variable} ${golos.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
