import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { Shell } from "@/components/shell/Shell";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { DEFAULT_THEME, THEME_STORAGE_KEY } from "@/lib/theme/persistence";
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

// Pre-hydration no-flash theme script (design.md D2, ADR-worthy). Runs
// synchronously in <head> BEFORE first paint: reads the persisted theme from
// localStorage, falls back to the default if absent/unreadable/corrupt, and
// sets the `dark` class on <html> so Tailwind's class-strategy dark variant is
// correct on the very first frame — no flash of the wrong theme (FR-SHELL-02).
const noFlashThemeScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t!=="light"&&t!=="dark"){t=${JSON.stringify(
  DEFAULT_THEME,
)};}document.documentElement.classList.toggle("dark",t==="dark");}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="uk"
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
