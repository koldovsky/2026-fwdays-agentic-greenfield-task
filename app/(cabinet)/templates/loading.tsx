import { PageHeader } from "@/components/shell/PageHeader";
import { LoadingState } from "@/components/states/LoadingState";
import { uk } from "@/lib/i18n/uk";

/**
 * Streamed loading fallback for the templates list (FR-TPL-01, FR-SHELL-03).
 * Next renders this while the server component awaits the template fetch, so
 * the screen has an explicit loading state — never a blank area.
 */
export default function TemplatesLoading() {
  return (
    <>
      <PageHeader title={uk.templates.title} />
      <div className="px-[var(--space-9)] py-[var(--space-8)]">
        <LoadingState />
      </div>
    </>
  );
}
