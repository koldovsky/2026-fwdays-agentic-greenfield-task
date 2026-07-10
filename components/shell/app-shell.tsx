import type { ReactNode } from "react";

import { AppNav } from "@/components/shell/app-nav";
import { SkipToContent } from "@/components/shell/skip-to-content";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <>
      <SkipToContent />
      <div className="flex min-h-full flex-col bg-background text-foreground">
        <header>
          <div className="mx-auto max-w-2xl px-4 pt-4 sm:px-6">
            <p className="text-sm font-medium text-foreground-muted">TinyStart</p>
          </div>
          <AppNav />
        </header>
        <main id="main-content" className="flex flex-1 flex-col">
          {children}
        </main>
      </div>
    </>
  );
}
