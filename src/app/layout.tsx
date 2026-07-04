import type { Metadata } from "next";
import { Golos_Text, Unbounded } from "next/font/google";
import { siteDescription, siteName, siteUrl } from "@/shared/config";
import "./globals.css";
import { Providers } from "./providers";

// Ukrainian-first (NFR-I18N-01): display + body faces include a Cyrillic subset so
// Ukrainian renders on-brand, not in a latin-only fallback (add-language-toggle).
const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const golos = Golos_Text({
  variable: "--font-golos",
  subsets: ["latin", "cyrillic"],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${unbounded.variable} ${golos.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
