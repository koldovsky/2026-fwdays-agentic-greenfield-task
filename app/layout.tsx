import type { Metadata } from "next";
import { Unbounded, Manrope } from "next/font/google";
import "./globals.css";
import { Header } from "@/app/components/Header";
import { DeadlineBanner } from "@/app/components/DeadlineBanner";
import { Disclaimer } from "@/app/components/Disclaimer";

// Self-hosted brand fonts (no runtime request to Google). Exposed as CSS
// variables and bound to the design system's --pk-font-* tokens in globals.css.
// Cyrillic subset is required — the UI is Ukrainian (BC-LANG-01).
const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  variable: "--font-unbounded",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Прохідний — оцініть свої шанси на вступ",
  description:
    "Прохідний допомагає абітурієнтам оцінити реалістичні шанси на вступ до українських ЗВО на основі балів НМТ.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" className={`${unbounded.variable} ${manrope.variable}`}>
      <body>
        <div className="pk-shell">
          <Header />
          <div className="pk-container pk-deadline-slot">
            <DeadlineBanner />
          </div>
          <main className="pk-main">
            <div className="pk-container">{children}</div>
          </main>
          <Disclaimer />
        </div>
      </body>
    </html>
  );
}
