import type { ReactNode } from "react";
import { Terminal } from "lucide-react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh">
      {/* ambient grid + scanline overlays */}
      <div aria-hidden className="pointer-events-none fixed inset-0 grid-lines opacity-40" />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "repeating-linear-gradient(to bottom, transparent 0 2px, color-mix(in oklab, white 2%, transparent) 3px 4px)",
          mixBlendMode: "overlay",
          opacity: 0.35,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-24"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--background) 90%, transparent), transparent)",
        }}
      />

      <header className="relative z-10">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-2.5">
            <div className="relative grid place-items-center size-7 rounded-sm border border-signal/40 bg-surface-raised text-signal">
              <Terminal className="size-3.5" strokeWidth={2.25} />
              <span
                aria-hidden
                className="absolute -inset-px rounded-sm opacity-60"
                style={{
                  boxShadow: "0 0 18px -2px color-mix(in oklab, var(--signal) 60%, transparent)",
                }}
              />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono-tabular text-[13px] tracking-[0.18em] uppercase text-foreground">
                Email Shadow Panel
              </span>
              <span className="hidden sm:inline font-mono-tabular text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                v0.1 · prototype
              </span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4 font-mono-tabular text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            <span>mock data</span>
            <span aria-hidden>·</span>
            <span>ready for backend adapter</span>
          </div>
        </div>
        <div
          aria-hidden
          className="mx-auto h-px max-w-[1400px]"
          style={{
            background:
              "linear-gradient(90deg, transparent, color-mix(in oklab, var(--signal) 30%, transparent), transparent)",
          }}
        />
      </header>

      <main className="relative z-10">{children}</main>

      <footer className="relative z-10 mx-auto max-w-[1400px] px-5 pb-6 pt-10 sm:px-8">
        <div className="font-mono-tabular text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
          local session storage · no auth · frontend prototype
        </div>
      </footer>
    </div>
  );
}
