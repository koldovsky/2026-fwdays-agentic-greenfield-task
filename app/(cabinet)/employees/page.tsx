import { PageHeader } from "@/components/shell/PageHeader";
import { EmptyState } from "@/components/states/EmptyState";
import { uk } from "@/lib/i18n/uk";

/**
 * Placeholder employees screen (FR-SHELL-01, FR-SHELL-03). Demonstrates the
 * sticky page header and the empty-state contract; the real directory is owned
 * by the directory slice.
 */
export default function EmployeesPage() {
  return (
    <>
      <PageHeader title={uk.shell.nav.employees} />
      <div className="px-[var(--space-9)] py-[var(--space-8)]">
        <EmptyState />
      </div>
    </>
  );
}
