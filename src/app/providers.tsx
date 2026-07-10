"use client";

// App-wide client providers. SessionProvider makes next-auth/react's useSession
// available to client islands (e.g. widgets/top-bar's TopBarSession) without
// forcing any route to resolve the session server-side — the landing page stays
// static for the NFR-PERF-04 budget (LCP margin ~20ms, docs/current-state.md).
import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
