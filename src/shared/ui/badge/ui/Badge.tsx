// Priority tag for checklist requirement rows (docs/vouch-design-system Badge).
// "must" renders in brand blue; "nice" in muted grey. Presentational, server-safe.

export interface BadgeProps {
  /** Priority level — controls color scheme. */
  readonly priority?: "must" | "nice";
}

const priorityClass: Record<NonNullable<BadgeProps["priority"]>, string> = {
  must: "text-brand bg-brand-wash",
  nice: "text-ink-muted bg-surface-canvas",
};

export function Badge({ priority = "must" }: BadgeProps) {
  return (
    <span
      className={
        "inline-flex items-center font-body text-[10px] font-bold uppercase " +
        `tracking-wide leading-[1.6] px-[7px] py-[2px] rounded-xs ${priorityClass[priority]}`
      }
    >
      {priority}
    </span>
  );
}
