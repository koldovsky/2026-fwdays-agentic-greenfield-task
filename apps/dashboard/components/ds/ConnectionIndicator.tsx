// apps/dashboard/components/ds — ConnectionIndicator (dashboard tasks.md
// §6.5, baseline spec's "SSE reconnect without state loss" requirement,
// "Disconnected state is visible, not silent" scenario). When connected it
// stays a quiet ambient dot (the dashboard should not shout "everything is
// fine" constantly); when disconnected it becomes an explicit, visible,
// Ukrainian `role="status"` message — never a silent gap.

import { Icon } from "./Icon.tsx";

export interface ConnectionIndicatorProps {
  connected: boolean;
}

export function ConnectionIndicator({ connected }: ConnectionIndicatorProps) {
  if (connected) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
        <span
          aria-hidden="true"
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: "var(--status-confirmed-solid)" }}
        />
        З&apos;єднання активне
      </span>
    );
  }

  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: "var(--status-pending-bg)", color: "var(--status-pending-fg)" }}
    >
      <Icon name="offline" size={14} />
      Немає з&apos;єднання — перепідключення...
    </span>
  );
}
