import { PageHeader } from "@/components/shell/PageHeader";
import { EmptyState } from "@/components/states/EmptyState";
import { uk } from "@/lib/i18n/uk";

/**
 * Placeholder cycles screen (FR-SHELL-01, FR-SHELL-03). Demonstrates the sticky
 * page header and the empty-state contract; the real cycle list is owned by the
 * cycles slice. No primary action is wired yet, so the header slot collapses.
 */
export default function CyclesPage() {
  return (
    <>
      <PageHeader title={uk.shell.nav.cycles} />
      <div className="px-[var(--space-9)] py-[var(--space-8)]">
        <EmptyState />
      </div>
    </>
  );
}
