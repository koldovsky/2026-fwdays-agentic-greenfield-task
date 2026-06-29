import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { Shell } from "@/components/shell/Shell";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { noFlashThemeScript } from "@/lib/theme/no-flash-script";
import { uk } from "@/lib/i18n/uk";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: uk.appTitle,
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
      // The pre-hydration no-flash script mutates the `dark` class on <html>
      // before React hydrates, so the client DOM's class attribute diverges
      // from the server snapshot (which never carries `dark`). This is the
      // conventional no-flash pattern; suppress the expected mismatch on this
      // one element only (FR-SHELL-02).
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashThemeScript }} />
      </head>
      <body className="min-h-full">
        <ThemeProvider>
          <Shell>{children}</Shell>
        </ThemeProvider>
      </body>
    </html>
  );
}
