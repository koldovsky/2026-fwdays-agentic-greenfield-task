// apps/dashboard/components/ds — EmptyState (dashboard tasks.md §6.5,
// baseline spec's "Empty states" requirement): an explicit, friendly
// Ukrainian message — NEVER a blank region, a spinner that never resolves,
// or an error — for "no active conversations" / "no pending requests" /
// any other zero-data view.

import { Icon, type IconName } from "./Icon.tsx";

export interface EmptyStateProps {
  message: string;
  icon?: IconName;
}

export function EmptyState({ message, icon = "chat" }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-10 px-4 text-center">
      <Icon name={icon} size={22} className="text-text-muted" />
      <p className="text-sm text-text-secondary">{message}</p>
    </div>
  );
}
