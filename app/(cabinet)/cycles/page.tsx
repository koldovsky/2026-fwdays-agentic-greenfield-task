// @trace FR-CYCLE-05 FR-SHELL-03
import { Suspense } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shell/PageHeader";
import { EmptyState } from "@/components/states/EmptyState";
import { LoadingState } from "@/components/states/LoadingState";
import { uk } from "@/lib/i18n/uk";
import { formatDaysRemaining } from "@/lib/i18n/format";
import { listCycles } from "./queries";
import { listTemplates } from "@/app/(cabinet)/templates/queries";
import { listActiveEmployees } from "@/app/(cabinet)/employees/queries";
import { CreateCycleForm } from "./CreateCycleForm";
import type { CycleListRow } from "./queries";

const t = uk.cycles;

/**
 * Cycles list page (FR-CYCLE-05, FR-SHELL-03). Server component: fetches
 * cycles, templates, and active employees; renders the list and inline create
 * form. Each row links to the cycle detail page. Empty/loading states.
 */
export default async function CyclesPage() {
  return (
    <>
      <PageHeader title={t.title} />
      <div className="px-[var(--space-9)] py-[var(--space-8)] flex flex-col gap-[var(--space-9)]">
        <Suspense fallback={<LoadingState />}>
          <CyclesContent />
        </Suspense>
      </div>
    </>
  );
}

async function CyclesContent() {
  const [cycles, templates, employees] = await Promise.all([
    listCycles(),
    listTemplates(),
    listActiveEmployees(),
  ]);

  const employeeRows = employees.map((e) => ({ id: e.id, fullName: e.fullName }));

  return (
    <div className="flex flex-col gap-[var(--space-9)]">
      <CreateCycleForm templates={templates} employees={employeeRows} />
      {cycles.length === 0 ? (
        <EmptyState title={t.empty.title} body={t.empty.description} />
      ) : (
        <CycleTable cycles={cycles} />
      )}
    </div>
  );
}

function CycleTable({ cycles }: { cycles: CycleListRow[] }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line-soft">
      <table className="w-full border-collapse text-[var(--text-base)]">
        <thead>
          <tr className="border-b border-line-soft bg-surface text-left">
            <th className="px-[var(--space-7)] py-[var(--space-6)] font-[var(--weight-medium)] text-ink-muted">
              {t.list.subject}
            </th>
            <th className="px-[var(--space-7)] py-[var(--space-6)] font-[var(--weight-medium)] text-ink-muted">
              {t.list.methodology}
            </th>
            <th className="px-[var(--space-7)] py-[var(--space-6)] font-[var(--weight-medium)] text-ink-muted">
              {t.list.deadline}
            </th>
            <th className="px-[var(--space-7)] py-[var(--space-6)] font-[var(--weight-medium)] text-ink-muted">
              {t.list.progress}
            </th>
            <th className="px-[var(--space-7)] py-[var(--space-6)] font-[var(--weight-medium)] text-ink-muted">
              {t.list.status}
            </th>
          </tr>
        </thead>
        <tbody>
          {cycles.map((cycle) => (
            <CycleRow key={cycle.id} cycle={cycle} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CycleRow({ cycle }: { cycle: CycleListRow }) {
  const methodology = cycle.snapshot?.methodology ?? "—";
  const statusLabel = t.status[cycle.status];
  const deadlineText = formatDaysRemaining(cycle.daysRemaining, t.overdue);

  const deadlineDate = cycle.deadline.toISOString().slice(0, 10);

  return (
    <tr className="border-b border-line-soft last:border-b-0 hover:bg-[var(--line-faint)] transition-colors duration-[var(--motion-fast)]">
      <td className="px-[var(--space-7)] py-[var(--space-6)] text-ink">
        <Link
          href={`/cycles/${cycle.id}`}
          className="focus-ring rounded-[var(--radius-sm)] underline-offset-2 hover:underline"
        >
          {cycle.subject.fullName}
        </Link>
      </td>
      <td className="px-[var(--space-7)] py-[var(--space-6)] text-ink-muted">
        {methodology}
      </td>
      <td className="px-[var(--space-7)] py-[var(--space-6)] text-ink-muted">
        <span title={deadlineDate}>{deadlineText}</span>
      </td>
      <td className="px-[var(--space-7)] py-[var(--space-6)] text-ink-muted">
        {cycle.answered}/{cycle.total}
      </td>
      <td className="px-[var(--space-7)] py-[var(--space-6)] text-ink">
        {statusLabel}
      </td>
    </tr>
  );
}
