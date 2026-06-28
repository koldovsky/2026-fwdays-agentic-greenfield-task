import type { ReactNode } from "react";

/**
 * The sticky page header (FR-SHELL-01): the screen title (`<h1>`) on the left,
 * an optional single primary action right-aligned. When no action is passed the
 * slot collapses cleanly — no empty control. A long title truncates within the
 * header bounds and never overlaps or pushes the action off-screen.
 */
export function PageHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-[var(--space-7)] border-b border-line-soft bg-paper px-[var(--space-9)] py-[var(--space-7)]">
      <h1 className="min-w-0 flex-1 truncate text-[var(--text-lg)] font-[var(--weight-medium)] text-ink">
        {title}
      </h1>
      {action !== undefined ? (
        <div className="shrink-0">{action}</div>
      ) : null}
    </header>
  );
}
