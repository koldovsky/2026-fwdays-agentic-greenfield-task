// apps/dashboard/components/ds — SlotChip (dashboard tasks.md §6.5,
// DESIGN.md: "SlotChip (weekday + mono time)"). Read-only display pill —
// unlike `Chip` (an interactive filter/toggle), a slot is stated as a fact,
// never a button here (the DecisionBar/HallMap own the clickable affordances).

export interface SlotChipProps {
  weekdayLabel: string;
  time: string;
}

export function SlotChip({ weekdayLabel, time }: SlotChipProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 py-1 text-sm text-text">
      <span>{weekdayLabel}</span>
      <span className="font-mono text-xs text-text-secondary">{time}</span>
    </span>
  );
}
