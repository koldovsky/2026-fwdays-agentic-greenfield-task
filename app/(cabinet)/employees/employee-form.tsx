"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/forms/Button";
import { Field } from "@/components/forms/Field";
import { Input } from "@/components/forms/Input";
import {
  employeeInputSchema,
  toFieldErrors,
  type EmployeeFieldErrors,
} from "@/lib/schemas/employee";
import { createEmployee, updateEmployee, type EmployeeActionResult } from "./actions";
import { uk } from "@/lib/i18n/uk";

/** The serialisable subset of an employee the form edits. */
export type EmployeeFormValues = {
  id?: string;
  fullName: string;
  email: string;
  role: string;
  phone: string;
  telegramHandle: string;
};

const EMPTY: EmployeeFormValues = {
  fullName: "",
  email: "",
  role: "",
  phone: "",
  telegramHandle: "",
};

type FieldName = keyof Pick<
  EmployeeFormValues,
  "fullName" | "email" | "role" | "phone" | "telegramHandle"
>;

/**
 * Add/edit employee form (FR-DIR-01, FR-DIR-03, NFR-A11Y-01). Validates each
 * field on blur via the shared `employeeInputSchema`, showing the specific
 * inline message per field. Required fields block submit, each with its own
 * message — never one generic banner. On submit it calls the server action and
 * renders any returned `fieldErrors` inline. Keyed by the row identity upstream
 * so the DOM re-syncs after a save. One quiet success path (no celebratory UI).
 */
export function EmployeeForm({
  initial,
  onClose,
  onSaved,
}: {
  initial?: EmployeeFormValues;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = uk.directory;
  const [values, setValues] = useState<EmployeeFormValues>(initial ?? EMPTY);
  const [errors, setErrors] = useState<EmployeeFieldErrors>({});
  const [pending, startTransition] = useTransition();

  function setField(field: FieldName, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function validateField(field: FieldName) {
    const result = employeeInputSchema.safeParse(values);
    const next = result.success ? {} : toFieldErrors(result.error);
    setErrors((current) => ({ ...current, [field]: next[field] }));
  }

  function handleResult(result: EmployeeActionResult) {
    if (result.ok) {
      onSaved();
      return;
    }
    setErrors(result.fieldErrors);
  }

  function handleSubmit() {
    const result = employeeInputSchema.safeParse(values);
    if (!result.success) {
      setErrors(toFieldErrors(result.error));
      return;
    }
    setErrors({});

    const formData = new FormData();
    formData.set("fullName", values.fullName);
    formData.set("email", values.email);
    formData.set("role", values.role);
    formData.set("phone", values.phone);
    formData.set("telegramHandle", values.telegramHandle);

    const id = initial?.id;
    startTransition(async () => {
      const result = id === undefined
        ? await createEmployee(formData)
        : await updateEmployee(id, formData);
      handleResult(result);
    });
  }

  function describedBy(field: FieldName): string | undefined {
    return errors[field] !== undefined ? `${field}-error` : undefined;
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
      noValidate
      className="flex flex-col gap-[var(--space-8)] rounded-[var(--radius-md)] border border-line-soft bg-surface p-[var(--space-9)]"
    >
      <h2 className="text-[var(--text-lg)] font-[var(--weight-medium)] text-ink">
        {initial?.id === undefined ? t.addEmployee : t.editEmployee}
      </h2>
      <Field id="fullName" label={t.fields.fullName} error={errors.fullName}>
        <Input
          id="fullName"
          name="fullName"
          value={values.fullName}
          autoComplete="off"
          aria-invalid={errors.fullName !== undefined}
          aria-describedby={describedBy("fullName")}
          onChange={(event) => setField("fullName", event.target.value)}
          onBlur={() => validateField("fullName")}
        />
      </Field>

      <Field id="email" label={t.fields.email} error={errors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          value={values.email}
          autoComplete="off"
          aria-invalid={errors.email !== undefined}
          aria-describedby={describedBy("email")}
          onChange={(event) => setField("email", event.target.value)}
          onBlur={() => validateField("email")}
        />
      </Field>

      <Field id="role" label={t.fields.role} hint={t.fields.optional} error={errors.role}>
        <Input
          id="role"
          name="role"
          value={values.role}
          autoComplete="off"
          aria-invalid={errors.role !== undefined}
          aria-describedby={describedBy("role")}
          onChange={(event) => setField("role", event.target.value)}
          onBlur={() => validateField("role")}
        />
      </Field>

      <Field id="phone" label={t.fields.phone} hint={t.fields.optional} error={errors.phone}>
        <Input
          id="phone"
          name="phone"
          type="tel"
          value={values.phone}
          autoComplete="off"
          aria-invalid={errors.phone !== undefined}
          aria-describedby={describedBy("phone")}
          onChange={(event) => setField("phone", event.target.value)}
          onBlur={() => validateField("phone")}
        />
      </Field>

      <Field
        id="telegramHandle"
        label={t.fields.telegram}
        hint={t.fields.optional}
        error={errors.telegramHandle}
      >
        <Input
          id="telegramHandle"
          name="telegramHandle"
          value={values.telegramHandle}
          autoComplete="off"
          aria-invalid={errors.telegramHandle !== undefined}
          aria-describedby={describedBy("telegramHandle")}
          onChange={(event) => setField("telegramHandle", event.target.value)}
          onBlur={() => validateField("telegramHandle")}
        />
      </Field>

      <div className="flex justify-end gap-[var(--space-6)]">
        <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
          {t.cancel}
        </Button>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? t.saving : t.save}
        </Button>
      </div>
    </form>
  );
}
