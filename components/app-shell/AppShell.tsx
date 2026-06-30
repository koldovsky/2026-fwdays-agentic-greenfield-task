import type { ReactNode } from "react";
import { AppFooter } from "./AppFooter";
import { AppHeader } from "./AppHeader";
import { ShellSkeleton } from "./ShellSkeleton";

export type AppShellProps = {
  left?: ReactNode;
  right?: ReactNode;
  leftEmptyMessage?: string;
  rightEmptyMessage?: string;
  loading?: boolean;
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

/** @trace FR-SHELL-01 @trace FR-SHELL-02 @trace FR-SHELL-04 */
export function AppShell({
  left,
  right,
  leftEmptyMessage,
  rightEmptyMessage,
  loading = false,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <AppHeader />
      <main className="shell-main">
        <section className="shell-main__column" aria-label="Список курсів">
          <ShellSlot
            loading={loading}
            emptyMessage={leftEmptyMessage}
          >
            {left}
          </ShellSlot>
        </section>
        <section className="shell-main__column" aria-label="Обрана валюта">
          <ShellSlot
            loading={loading}
            emptyMessage={rightEmptyMessage}
          >
            {right}
          </ShellSlot>
        </section>
      </main>
      <AppFooter />
    </div>
  );
}
