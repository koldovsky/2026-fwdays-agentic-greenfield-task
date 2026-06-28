"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Archive } from "lucide-react";
import { Button } from "@/components/forms/Button";
import { EmptyState } from "@/components/states/EmptyState";
import { EmployeeForm, type EmployeeFormValues } from "./employee-form";
import { archiveEmployee } from "./actions";
import { uk } from "@/lib/i18n/uk";

/** The directory list item — serialisable, never carries PII beyond the row. */
export type EmployeeRow = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  phone: string;
  telegramHandle: string;
};

type Mode = { kind: "list" } | { kind: "add" } | { kind: "edit"; row: EmployeeRow };

/**
 * Client directory view (FR-DIR-02, FR-DIR-04). Owns the add/edit form open
 * state and the archive confirm, rendering the active employees passed from the
 * server page. The "Add employee" affordance lives in the sticky `PageHeader`;
 * an empty list shows the shared `EmptyState`. Each row shows name, mono email,
 * role, and an active/archived TEXT status label (status never by colour alone,
 * NFR-A11Y-02) with edit and archive controls. After a write it refreshes the
 * server data so the list re-syncs.
 */
export function DirectoryView({ employees }: { employees: EmployeeRow[] }) {
  const t = uk.directory;
  const router = useRouter();
  const [mode, setMode] = useState<Mode>({ kind: "list" });
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toFormValues(row: EmployeeRow): EmployeeFormValues {
    return {
      id: row.id,
      fullName: row.fullName,
      email: row.email,
      role: row.role,
      phone: row.phone,
      telegramHandle: row.telegramHandle,
    };
  }

  function onSaved() {
    setMode({ kind: "list" });
    router.refresh();
  }

  function onArchive(row: EmployeeRow) {
    if (!window.confirm(t.archiveConfirm)) return;
    setArchiveError(null);
    setArchivingId(row.id);
    startTransition(async () => {
      const result = await archiveEmployee(row.id);
      setArchivingId(null);
      if (result.ok) {
        router.refresh();
        return;
      }
      // The action never throws; a failed archive returns ok:false. Surface it
      // inline so the row does not silently reappear with no explanation.
      setArchiveError(row.id);
    });
  }

  return (
    <div className="flex flex-col gap-[var(--space-9)]">
      {mode.kind === "list" ? (
        <div className="flex justify-end">
          <Button type="button" variant="primary" onClick={() => setMode({ kind: "add" })}>
            {t.addEmployee}
          </Button>
        </div>
      ) : (
        <EmployeeForm
          key={mode.kind === "edit" ? mode.row.id : "add"}
          initial={mode.kind === "edit" ? toFormValues(mode.row) : undefined}
          onClose={() => setMode({ kind: "list" })}
          onSaved={onSaved}
        />
      )}

      {mode.kind === "list" ? (
        employees.length === 0 ? (
          <EmptyState title={t.emptyTitle} body={t.emptyBody} />
        ) : (
          <ul className="flex flex-col gap-[var(--space-5)]">
            {employees.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-[var(--space-5)] rounded-[var(--radius-md)] border border-line-soft bg-surface px-[var(--space-8)] py-[var(--space-7)]"
              >
                <div className="flex items-center gap-[var(--space-7)]">
                <div className="flex min-w-0 flex-1 flex-col gap-[var(--space-2)]">
                  <span className="truncate text-[var(--text-md)] font-[var(--weight-medium)] text-ink">
                    {row.fullName}
                  </span>
                  <span className="truncate font-[family-name:var(--font-mono)] text-[var(--text-base)] text-ink-muted">
                    {row.email}
                  </span>
                  {row.role.length > 0 ? (
                    <span className="truncate text-[var(--text-base)] text-ink-muted">
                      {row.role}
                    </span>
                  ) : null}
                </div>
                <span className="shrink-0 text-[var(--text-base)] text-ink-muted">
                  {t.statusActive}
                </span>
                <div className="flex shrink-0 gap-[var(--space-5)]">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setMode({ kind: "edit", row })}
                  >
                    <Pencil aria-hidden="true" size={15} strokeWidth={1.8} />
                    <span className="ml-[var(--space-3)]">{t.edit}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onArchive(row)}
                    disabled={pending && archivingId === row.id}
                  >
                    <Archive aria-hidden="true" size={15} strokeWidth={1.8} />
                    <span className="ml-[var(--space-3)]">
                      {pending && archivingId === row.id ? t.archiving : t.archive}
                    </span>
                  </Button>
                </div>
                </div>
                {archiveError === row.id ? (
                  <p role="alert" className="text-[var(--text-base)] text-[var(--danger-ink)]">
                    {t.errors.saveFailed}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
