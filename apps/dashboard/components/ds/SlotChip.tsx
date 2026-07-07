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
  // booking-hitl S4 rendered-UI gate fix (axe `color-contrast`, dark theme,
  // slot-picker OPEN with a selection): a SELECTED chip's background becomes
  // `--brand-soft` (a translucent teal/green fill), and `--text-secondary`
  // measured ~4.3:1 against that composited fill in dark mode — just under
  // WCAG AA's 4.5:1 for this 12px mono time label. `--text` clears it with
  // real margin (~6.5:1 dark, even higher light) without affecting the
  // read-only pill or the UNselected checkbox option, which keep
  // `--text-secondary` against their own (always-compliant) surfaces.
  const timeColorClass = selected ? "text-text" : "text-text-secondary";
  const label = (
    <>
      <span>{weekdayLabel}</span>
      <span className={`font-mono text-xs ${timeColorClass}`}>{time}</span>
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
