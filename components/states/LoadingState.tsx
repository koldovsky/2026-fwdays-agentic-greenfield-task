import { uk } from "@/lib/i18n/uk";

/**
 * The canonical loading state (FR-SHELL-03). A labelled skeleton with an
 * accessible name and `aria-busy`, never a blank area. Status is conveyed by a
 * text label, not by colour alone. The label defaults to the i18n loading copy.
 */
export function LoadingState({ label = uk.shell.states.loading }: { label?: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="flex flex-col gap-[var(--space-7)] py-[var(--space-10)]"
    >
      <span className="text-[var(--text-base)] text-ink-muted">{label}</span>
      <div aria-hidden="true" className="flex flex-col gap-[var(--space-5)]">
        <div className="h-[var(--space-10)] w-full animate-pulse rounded-[var(--radius-md)] bg-[var(--line-faint)]" />
        <div className="h-[var(--space-10)] w-full animate-pulse rounded-[var(--radius-md)] bg-[var(--line-faint)]" />
        <div className="h-[var(--space-10)] w-2/3 animate-pulse rounded-[var(--radius-md)] bg-[var(--line-faint)]" />
      </div>
    </div>
  );
}
