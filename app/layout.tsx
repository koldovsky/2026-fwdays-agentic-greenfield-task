import type { Metadata } from "next";
import { Onest, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Onest — all UI + display text. Full Cyrillic, calm humanist sans.
const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

// JetBrains Mono — every numeric (temperatures, clock, lat/lon, data).
// Full Cyrillic, true tabular figures.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Надворі — Weather Explorer",
  description:
    "Надворі (outdoors) — a calm weather explorer that answers one question: will it be pleasant to be outside this weekend.",
};

const themeScript = `(function(){try{var t=localStorage.getItem("nadvori-theme");if(!t)t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t);}catch(_){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="uk"
      data-theme="light"
      suppressHydrationWarning
      className={`${onest.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        {/* Runs before any CSS to prevent flash of wrong theme (FOWT) */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-bg text-text font-sans">
        {children}
      </body>
    </html>
  );
}
