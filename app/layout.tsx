import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

// Display face (Fraunces) and body/UI (Inter), self-hosted via next/font (TC-FONT-01).
// Exposed as CSS variables that DESIGN.md maps to --font-display / --font-sans.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pause — break reminder",
  description: "A calm reminder to step away and take a break.",
};

export const viewport: Viewport = {
  themeColor: "#eef1f0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-dvh bg-bg font-sans text-ink">{children}</body>
    </html>
  );
}
