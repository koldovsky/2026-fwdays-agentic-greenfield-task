/**
 * Root layout — minimal. The static export requires `<html>` and `<body>`
 * to be in the layout (no document fragment). `<html lang="en">` for
 * screen-reader language detection. The QueryClientProvider is mounted
 * at the page level (it's only used by `useUploadEpub` and the SPA is a
 * single page in Phase 1).
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/styles/globals.css";

import { ClientProviders } from "./providers";

export const metadata: Metadata = {
  title: "epubtv — Upload an EPUB",
  description: "Translate and voice-over your EPUB files.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
