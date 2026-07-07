// apps/dashboard/components/ds — SlotChip (dashboard tasks.md §6.5,
// DESIGN.md: "SlotChip (weekday + mono time)"). Read-only display pill by
// DEFAULT — unlike `Chip` (an interactive filter/toggle), a slot is stated
// as a fact, never a button here (the DecisionBar/HallMap own the clickable
// affordances) UNLESS `onSelectedChange` is passed (booking-hitl S4's
// DecisionBar "Propose another time" picker), in which case this renders as
// a real selectable checkbox option instead: `<label>` + `<input
// type="checkbox">` (native `role="checkbox"`, keyboard-operable, a global
// `:focus-visible` ring already applies) with a border/background CHANGE on
// selection — never color-only (the axe + vision gate this feeds).

export interface SlotChipProps {
  weekdayLabel: string;
  time: string;
  /** Present + a handler => this chip becomes a selectable checkbox option
   *  (DecisionBar's inline slot-picker); absent => the original read-only
   *  display pill, unchanged. */
  selected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
}

export function SlotChip({ weekdayLabel, time, selected = false, onSelectedChange }: SlotChipProps) {
  const label = (
    <>
      <span>{weekdayLabel}</span>
      <span className="font-mono text-xs text-text-secondary">{time}</span>
    </>
  );

  if (onSelectedChange === undefined) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 py-1 text-sm text-text">
        {label}
      </span>
    );
  }

  return (
    <label
      className={`inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] border px-2.5 py-1 text-sm text-text transition-colors duration-[var(--duration-fast)]
        ${selected ? "border-brand bg-brand-soft" : "border-border bg-surface hover:bg-surface-hover"}`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={(event) => onSelectedChange(event.target.checked)}
        className="h-4 w-4 shrink-0 accent-[var(--brand)]"
      />
      {label}
    </label>
  );
}
