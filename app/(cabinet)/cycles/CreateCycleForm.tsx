"use client";
// @trace FR-CYCLE-01

import { useRouter } from "next/navigation";
import { useActionState, useMemo, useRef } from "react";
import { Field } from "@/components/forms/Field";
import { Button } from "@/components/forms/Button";
import { createCycle } from "./actions";
import { uk } from "@/lib/i18n/uk";
import type { CreateCycleResult } from "./actions";

const t = uk.cycles;

type Props = {
  templates: Array<{ id: string; name: string }>;
  employees: Array<{ id: string; fullName: string }>;
};

const initialState: CreateCycleResult = {
  ok: false as const,
  fieldErrors: {},
};

/**
 * Create-cycle form (FR-CYCLE-01). Client component for interactivity:
 * select a template, a non-archived employee, and a future date. Submits to
 * the createCycle server action; renders fieldErrors inline; on success
 * navigates to the new cycle's detail page.
 */
export function CreateCycleForm({ templates, employees }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  // Compute tomorrow's ISO date for the date picker min attribute (client-side,
  // so no hydration mismatch; prevents selection of past/today dates in the UI).
  const tomorrowISO = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const [state, formAction, isPending] = useActionState(
    async (_prev: CreateCycleResult, formData: FormData): Promise<CreateCycleResult> => {
      const result = await createCycle(formData);
      if (result.ok) {
        router.push(`/cycles/${result.id}`);
      }
      return result;
    },
    initialState,
  );

  const fieldErrors = state.ok ? {} : (state.fieldErrors ?? {});
  const globalError = !state.ok ? state.error : undefined;

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-[var(--space-7)] rounded-[var(--radius-lg)] border border-line-soft bg-surface p-[var(--space-8)]"
    >
      <h2 className="text-[var(--text-md)] font-[var(--weight-medium)] text-ink">
        {t.createCycle}
      </h2>

      {globalError !== undefined ? (
        <p role="alert" className="text-[var(--text-base)] text-[var(--danger-ink)]">
          {globalError}
        </p>
      ) : null}

      <Field
        id="templateId"
        label={t.form.templateLabel}
        error={fieldErrors["templateId"]?.[0]}
      >
        {templates.length === 0 ? (
          <p className="text-ink-muted">{t.form.noTemplates}</p>
        ) : (
          <select
            id="templateId"
            name="templateId"
            aria-invalid={fieldErrors["templateId"] !== undefined}
            aria-describedby={
              fieldErrors["templateId"] !== undefined ? "templateId-error" : undefined
            }
            className="focus-ring w-full rounded-[var(--radius-md)] border border-line-strong bg-paper px-[var(--space-6)] py-[var(--space-5)] text-[var(--text-body)] text-ink aria-[invalid=true]:border-[var(--danger-ink)]"
          >
            <option value="">{t.form.templateLabel}</option>
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field
        id="subjectId"
        label={t.form.subjectLabel}
        error={fieldErrors["subjectId"]?.[0]}
      >
        {employees.length === 0 ? (
          <p className="text-ink-muted">{t.form.noEmployees}</p>
        ) : (
          <select
            id="subjectId"
            name="subjectId"
            aria-invalid={fieldErrors["subjectId"] !== undefined}
            aria-describedby={
              fieldErrors["subjectId"] !== undefined ? "subjectId-error" : undefined
            }
            className="focus-ring w-full rounded-[var(--radius-md)] border border-line-strong bg-paper px-[var(--space-6)] py-[var(--space-5)] text-[var(--text-body)] text-ink aria-[invalid=true]:border-[var(--danger-ink)]"
          >
            <option value="">{t.form.subjectLabel}</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.fullName}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field
        id="deadline"
        label={t.form.deadlineLabel}
        error={fieldErrors["deadline"]?.[0]}
      >
        <input
          id="deadline"
          name="deadline"
          type="date"
          min={tomorrowISO}
          aria-invalid={fieldErrors["deadline"] !== undefined}
          aria-describedby={
            fieldErrors["deadline"] !== undefined ? "deadline-error" : undefined
          }
          className="focus-ring w-full rounded-[var(--radius-md)] border border-line-strong bg-paper px-[var(--space-6)] py-[var(--space-5)] text-[var(--text-body)] text-ink aria-[invalid=true]:border-[var(--danger-ink)]"
        />
      </Field>

      <div>
        <Button
          type="submit"
          variant="primary"
          disabled={isPending || templates.length === 0 || employees.length === 0}
        >
          {isPending ? t.form.submitting : t.form.submit}
        </Button>
      </div>
    </form>
  );
}
