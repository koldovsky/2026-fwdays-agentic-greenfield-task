import type { Metadata } from "next";
import { Quicksand, Mulish, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

import { Shell } from "@/components/shell/Shell";
import { uk } from "@/lib/i18n/uk";

// «Поливайко» typography (design D2): Quicksand for display/headings, Mulish
// for body/inputs (incl. italic for latin names), Spline Sans Mono for meta.
// Each exposed as a CSS-var handle consumed by the `@theme` font families.
// Quicksand + Spline Sans Mono ship latin only (no Cyrillic subset on Google
// Fonts); Mulish ships Cyrillic. The `@theme` font stacks fall through to Mulish
// then a system sans so Cyrillic headings/meta still render — the Latin display
// face applies to latin glyphs (design D2). Per-subset rendering nuance is a
// Phase-6 vision concern.
const quicksand = Quicksand({
  variable: "--font-display-handle",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
  display: "swap",
});

const mulish = Mulish({
  variable: "--font-body-handle",
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const splineSansMono = Spline_Sans_Mono({
  variable: "--font-mono-handle",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: uk.brand,
  description: "Відстеження росту та поливу сукулентів (грошових дерев)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="uk"
      className={`${quicksand.variable} ${mulish.variable} ${splineSansMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
