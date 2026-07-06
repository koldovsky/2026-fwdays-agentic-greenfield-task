import type { Metadata } from "next";
import { Golos_Text, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Fonts (dashboard tasks.md §6.1, DESIGN.md "Type"/"Fonts"): Golos Text for
// all UI/display text, JetBrains Mono for every date/time/age. DESIGN.md
// asks for self-hosted local font FILES via `next/font/local`; this repo
// has no binary font assets checked in, so per the task's own documented
// fallback we use `next/font/google` instead — Next fetches + SELF-HOSTS
// these two families at build time (no runtime request to Google, so
// NFR-LOCAL-01's "no external font request" still holds at request time)
// and both ship a `cyrillic` subset (verified against the installed
// `next/font/google` package's own `font-data.json` before wiring this —
// `node_modules/next/dist/compiled/@next/font/dist/google/font-data.json`
// lists `"subsets": ["cyrillic", "cyrillic-ext", "latin", "latin-ext"]` for
// "Golos Text" and adds "greek"/"vietnamese" for "JetBrains Mono" — both
// cover the Ukrainian-first UI). JetBrains Mono's own glyphs are
// monospaced/tabular by construction, satisfying DESIGN.md's "tabular
// figures" requirement for the queue's timestamps without extra
// `font-feature-settings`.
const golosText = Golos_Text({
  variable: "--font-golos",
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kamerton — панель викладача",
  description: "Локальна панель для запису на вокал: розмови, заявки, розклад залу.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" className={`${golosText.variable} ${jetBrainsMono.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-bg text-text font-sans antialiased">{children}</body>
    </html>
  );
}
