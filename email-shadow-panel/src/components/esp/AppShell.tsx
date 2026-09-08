import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { LockKeyhole } from "lucide-react";
import { AppLogo } from "./AppLogo";
import { APP_SHELL_NOTICE } from "@/lib/appShellState";

export type AppShellVariant = "default" | "mailbox";

function HeaderStatusItem({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[0.86rem] text-muted-foreground sm:text-[0.9rem]">
      {icon}
      <span>{label}</span>
    </span>
  );
}

export function AppShell({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: AppShellVariant;
}) {
  const showHeader = variant !== "mailbox";

  return (
    <div className="relative flex h-dvh min-h-dvh flex-col overflow-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 grid-lines opacity-35" />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "repeating-linear-gradient(to bottom, transparent 0 2px, color-mix(in oklab, white 2%, transparent) 3px 4px)",
          mixBlendMode: "overlay",
          opacity: 0.28,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-24"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--background) 94%, transparent), transparent)",
        }}
      />

      {showHeader ? (
        <header className="relative z-10 shrink-0 bg-background/50 backdrop-blur-sm">
          <div className="mx-auto flex max-w-[1760px] items-center justify-between gap-4 px-4 py-1.5 sm:px-8 sm:py-2">
            <Link
              to="/"
              aria-label="Email Shadow Panel home"
              className="group flex min-w-0 items-center gap-2.5 rounded-md outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-signal/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:gap-3"
            >
              <AppLogo className="size-7 shrink-0 sm:size-8" />
              <span
                className="min-w-0 truncate font-mono-tabular text-[0.78rem] font-semibold uppercase tracking-[0.2em] sm:text-[0.92rem] sm:tracking-[0.24em]"
                aria-label="Email Shadow Panel"
              >
                <span className="text-foreground">EMAIL</span>{" "}
                <span className="text-signal">SHADOW PANEL</span>
              </span>
            </Link>

            <div className="hidden items-center gap-3 sm:flex sm:gap-5">
              <HeaderStatusItem
                icon={<LockKeyhole className="size-4" />}
                label={APP_SHELL_NOTICE}
              />
            </div>
          </div>
          <div aria-hidden className="esp-header-divider absolute inset-x-0 bottom-0 h-px" />
        </header>
      ) : null}

      <main className="relative z-10 min-h-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
