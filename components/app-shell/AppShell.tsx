import type { ReactNode } from "react";
import { uk } from "@/lib/i18n/uk";
import { AppFooter } from "./AppFooter";
import { AppHeader } from "./AppHeader";
import { ShellSkeleton } from "./ShellSkeleton";

export type AppShellProps = {
  left?: ReactNode;
  right?: ReactNode;
  leftEmptyMessage?: string;
  rightEmptyMessage?: string;
  loading?: boolean;
  footerSaying?: string;
};

function ShellSlot({
  loading,
  children,
  emptyMessage,
}: {
  loading?: boolean;
  children?: ReactNode;
  emptyMessage?: string;
}) {
  if (loading) {
    return <ShellSkeleton />;
  }

  if (children != null) {
    return children;
  }

  if (emptyMessage) {
    return (
      <p className="shell-slot-empty" role="status">
        {emptyMessage}
      </p>
    );
  }

  return null;
}

/** @trace FR-SHELL-01 @trace FR-SHELL-02 @trace FR-SHELL-04 @trace FR-I18N-01 @trace FR-SAYINGS-01 */
export function AppShell({
  left,
  right,
  leftEmptyMessage,
  rightEmptyMessage,
  loading = false,
  footerSaying,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <AppHeader />
      <main className="shell-main">
        <section
          className="shell-main__column"
          aria-label={uk.shell.ratesColumnLabel}
        >
          <ShellSlot
            loading={loading}
            emptyMessage={leftEmptyMessage}
          >
            {left}
          </ShellSlot>
        </section>
        <section
          className="shell-main__column shell-main__column--sticky"
          aria-label={uk.shell.focusColumnLabel}
        >
          <ShellSlot
            loading={loading}
            emptyMessage={rightEmptyMessage}
          >
            {right}
          </ShellSlot>
        </section>
      </main>
      <AppFooter saying={footerSaying} />
    </div>
  );
}
