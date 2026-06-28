// @trace FR-USAGE-03 NFR-SEC-01
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shell/PageHeader";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { uk } from "@/lib/i18n/uk";

const t = uk.usage;

function fetchRows() {
  return db.usageRow.findMany({
    select: {
      cycleId: true,
      purpose: true,
      model: true,
      costUsd: true,
      cycle: {
        select: {
          subject: { select: { fullName: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * HR aggregate spend view (FR-USAGE-03). Server component: the proxy guard
 * guarantees an authenticated cabinet session before this renders (NFR-SEC-01).
 * Reads stored costUsd values — precomputed by recordUsage via cost() at
 * write time — and aggregates them in-process: grand total and per-cycle
 * totals each broken down by model and purpose.
 */
export default async function UsagePage() {
  let rows: Awaited<ReturnType<typeof fetchRows>>;
  try {
    rows = await fetchRows();
  } catch {
    return (
      <>
        <PageHeader title={t.pageTitle} />
        <div className="p-[var(--space-9)]">
          <ErrorState
            title={uk.shell.states.errorTitle}
            body={uk.shell.states.errorBody}
          />
        </div>
      </>
    );
  }

  if (rows.length === 0) {
    return (
      <>
        <PageHeader title={t.pageTitle} />
        <div className="p-[var(--space-9)]">
          <EmptyState title={t.emptyTitle} body={t.emptyBody} />
        </div>
      </>
    );
  }

  const grandTotal = rows.reduce((sum, r) => sum + r.costUsd, 0);

  // Group by cycleId preserving insertion order (asc by createdAt).
  const byCycle = new Map<
    string,
    {
      subjectName: string;
      rows: typeof rows;
      total: number;
    }
  >();
  for (const row of rows) {
    const existing = byCycle.get(row.cycleId);
    if (existing === undefined) {
      byCycle.set(row.cycleId, {
        subjectName: row.cycle.subject?.fullName ?? t.unknownCycle,
        rows: [row],
        total: row.costUsd,
      });
    } else {
      existing.rows.push(row);
      existing.total += row.costUsd;
    }
  }

  return (
    <>
      <PageHeader title={t.pageTitle} />

      <div className="p-[var(--space-9)]">
        {/* Grand total summary */}
        <section aria-label={t.grandTotal}>
          <h2 className="text-[var(--text-sm)] font-[var(--weight-semibold)] uppercase tracking-wide text-ink-muted">
            {t.grandTotal}
          </h2>
          <p className="mt-[var(--space-3)] text-[var(--text-xl)] font-[var(--weight-semibold)] text-ink">
            {formatUsd(grandTotal)}
          </p>

          <div className="mt-[var(--space-6)]">
            <BreakdownTable rows={rows} />
          </div>
        </section>

        {/* Per-cycle breakdown */}
        <section aria-label={t.perCycle} className="mt-[var(--space-10)]">
          <h2 className="text-[var(--text-sm)] font-[var(--weight-semibold)] uppercase tracking-wide text-ink-muted">
            {t.perCycle}
          </h2>
          <div className="mt-[var(--space-6)] flex flex-col gap-[var(--space-8)]">
            {Array.from(byCycle.entries()).map(([cycleId, group]) => (
              <div key={cycleId}>
                <h3 className="text-[var(--text-base)] font-[var(--weight-medium)] text-ink">
                  {group.subjectName}
                  <span className="ml-[var(--space-4)] text-[var(--text-sm)] font-[var(--weight-regular)] text-ink-muted">
                    {formatUsd(group.total)}
                  </span>
                </h3>
                <div className="mt-[var(--space-4)]">
                  <BreakdownTable rows={group.rows} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

type UsageRow = {
  model: string;
  purpose: string;
  costUsd: number;
};

/**
 * A table showing cost grouped by model × purpose. Used for both the grand
 * total and the per-cycle sections.
 */
function BreakdownTable({ rows }: { rows: UsageRow[] }) {
  // Aggregate by model + purpose key.
  const byKey = new Map<string, { model: string; purpose: string; costUsd: number }>();
  for (const row of rows) {
    const key = `${row.model}|${row.purpose}`;
    const existing = byKey.get(key);
    if (existing === undefined) {
      byKey.set(key, { model: row.model, purpose: row.purpose, costUsd: row.costUsd });
    } else {
      existing.costUsd += row.costUsd;
    }
  }

  const entries = Array.from(byKey.values()).sort((a, b) =>
    a.model.localeCompare(b.model) || a.purpose.localeCompare(b.purpose),
  );

  return (
    <table className="w-full border-collapse text-[var(--text-sm)]">
      <thead>
        <tr className="border-b border-line-soft">
          <th className="pb-[var(--space-3)] text-left font-[var(--weight-medium)] text-ink-muted">
            {uk.usage.model}
          </th>
          <th className="pb-[var(--space-3)] text-left font-[var(--weight-medium)] text-ink-muted">
            {uk.usage.purpose}
          </th>
          <th className="pb-[var(--space-3)] text-right font-[var(--weight-medium)] text-ink-muted">
            {uk.usage.costUsd}
          </th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr
            key={`${entry.model}|${entry.purpose}`}
            className="border-b border-line-faint"
          >
            <td className="py-[var(--space-3)] font-[family-name:var(--font-mono)] text-ink">
              {entry.model}
            </td>
            <td className="py-[var(--space-3)] text-ink">
              {entry.purpose === "interview" ? uk.usage.purposeInterview : uk.usage.purposeSummary}
            </td>
            <td className="py-[var(--space-3)] text-right text-ink">
              {formatUsd(entry.costUsd)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function formatUsd(amount: number): string {
  return `$${amount.toFixed(4)}`;
}
