import type { Metadata } from "next";
import Script from "next/script";
import { IBM_Plex_Serif, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { ThemeScript } from "@/components/app-shell/ThemeScript";
import { uk } from "@/lib/i18n/uk";
import "./globals.css";

// Self-hosted IBM Plex trio (full Cyrillic) — Serif = display, Sans = UI/body,
// Mono = every numeric. Bound to the --font-plex-* vars that typography.css maps
// onto the semantic family aliases. See DESIGN.md.
const plexSerif = IBM_Plex_Serif({
  variable: "--font-plex-serif",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: uk.meta.title,
  description: uk.meta.description,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="uk"
      suppressHydrationWarning
      className={`${plexSerif.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeScript />
        {/* Lucide line icons — the design system's Icon component reads
            window.lucide. Flagged substitution (no house icon set yet). */}
        <Script
          src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js"
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  );
}
