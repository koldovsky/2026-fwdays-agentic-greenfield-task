import { PageHeader } from "@/components/shell/PageHeader";
import { LoadingState } from "@/components/states/LoadingState";
import { uk } from "@/lib/i18n/uk";

/**
 * Streamed loading fallback for the async employees server component
 * (FR-DIR-02, FR-SHELL-03). Next renders this while `EmployeesPage` awaits the
 * active-employee fetch, so the directory has an explicit loading state — never
 * a blank area — alongside its empty and error states. Reuses the shared
 * `LoadingState`, which carries the localized loading copy and `aria-busy`.
 */
export default function EmployeesLoading() {
  return (
    <>
      <PageHeader title={uk.directory.title} />
      <div className="px-[var(--space-9)] py-[var(--space-8)]">
        <LoadingState />
      </div>
    </>
  );
}
