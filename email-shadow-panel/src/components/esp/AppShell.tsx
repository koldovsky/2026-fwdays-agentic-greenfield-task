import type { ReactNode } from "react";
import { Archive, Clock3, LockKeyhole, Terminal } from "lucide-react";

function HeaderStatusItem({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      {icon}
      <span>{label}</span>
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-x-hidden">
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
        className="pointer-events-none fixed inset-x-0 top-0 h-28"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--background) 94%, transparent), transparent)",
        }}
      />

      <header className="relative z-10 border-b border-hairline/80 bg-background/55 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-5 px-5 py-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative grid size-10 shrink-0 place-items-center rounded-md border border-signal/45 bg-surface-raised text-signal shadow-[0_0_24px_-10px_var(--signal)]">
              <Terminal className="size-5" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <div className="truncate font-mono-tabular text-base font-semibold uppercase tracking-[0.18em] text-foreground sm:text-lg">
                EMAIL SHADOW PANEL
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-5 md:flex">
            <HeaderStatusItem
              icon={
                <span className="size-2.5 rounded-full bg-signal shadow-[0_0_14px_var(--signal)]" />
              }
              label="Service online"
            />
            <span aria-hidden className="h-6 w-px bg-hairline" />
            <HeaderStatusItem
              icon={<LockKeyhole className="size-4" />}
              label="Stored in this browser"
            />
            <span aria-hidden className="h-6 w-px bg-hairline" />
            <HeaderStatusItem icon={<Clock3 className="size-4" />} label="Recent inboxes" />
          </div>

          <div className="flex items-center gap-2 md:hidden" aria-label="Application status">
            <span className="size-2.5 rounded-full bg-signal shadow-[0_0_14px_var(--signal)]" />
            <Archive className="size-4 text-muted-foreground" />
          </div>
        </div>
      </header>

      <main className="relative z-10">{children}</main>
    </div>
  );
}
