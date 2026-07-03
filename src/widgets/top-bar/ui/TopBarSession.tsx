"use client";

// Client session island for routes that can't resolve the session server-side
// (e.g. the static landing page — FR-SHELL-01, NFR-PERF-04). Reads the session
// via next-auth/react's useSession under app/providers.tsx's SessionProvider
// and renders the same TopBar the server-resolved routes use. "loading" renders
// as anonymous, not a placeholder, so there is no layout shift while it settles.
import { useSession } from "next-auth/react";
import type { Locale } from "@/shared/lib/i18n";
import { TopBar } from "./TopBar";

export interface TopBarSessionProps {
  /** UI locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
}

export function TopBarSession({ locale = "ua" }: TopBarSessionProps) {
  const { data: session, status } = useSession();

  if (status === "authenticated") {
    return (
      <TopBar
        user={{ name: session.user?.name, email: session.user?.email }}
        locale={locale}
      />
    );
  }

  return <TopBar user={null} locale={locale} />;
}
