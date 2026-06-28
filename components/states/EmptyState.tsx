import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { uk } from "@/lib/i18n/uk";

/**
 * The canonical empty state (FR-SHELL-03): an outline icon, an explanatory
 * message, and an optional primary action (for example, create a record). Shown
 * when a successful fetch returns no records — never a blank area. All copy is
 * Ukrainian-first from `lib/i18n` by default; status reads as text, not colour.
 */
export function EmptyState({
  title = uk.shell.states.emptyTitle,
  body = uk.shell.states.emptyBody,
  icon: Icon = Inbox,
  action,
}: {
  title?: string;
  body?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-[var(--space-6)] py-[var(--space-11)] text-center"
    >
      <Icon
        aria-hidden="true"
        size={28}
        strokeWidth={1.8}
        className="text-ink-muted"
      />
      <div className="flex max-w-[var(--content-narrow)] flex-col gap-[var(--space-3)]">
        <p className="text-[var(--text-md)] font-[var(--weight-medium)] text-ink">{title}</p>
        <p className="text-[var(--text-base)] text-ink-muted">{body}</p>
      </div>
      {action !== undefined ? <div className="mt-[var(--space-3)]">{action}</div> : null}
    </div>
  );
}
