"use client";

import { cloneElement, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SupplierProfile, SupplierProfileInput } from "@/types/supplier";
import { validateSupplierProfileInput } from "@/lib/storage/supplier-profiles";

export type SupplierProfileFormValues = SupplierProfileInput;

const emptyValues: SupplierProfileFormValues = {
  label: "",
  nameEn: "",
  nameUa: "",
  addressEn: "",
  addressUa: "",
  taxId: "",
  bankName: "",
  swift: "",
  ibanUsd: "",
  ibanEur: "",
};

type SupplierProfileFormProps = {
  profile?: SupplierProfile | null;
  onSubmit: (values: SupplierProfileFormValues) => void;
  onCancel?: () => void;
  submitLabel?: string;
};

function profileToFormValues(profile: SupplierProfile): SupplierProfileFormValues {
  return {
    label: profile.label,
    nameEn: profile.nameEn,
    nameUa: profile.nameUa,
    addressEn: profile.addressEn,
    addressUa: profile.addressUa,
    taxId: profile.taxId,
    bankName: profile.bankName,
    swift: profile.swift,
    ibanUsd: profile.ibanUsd,
    ibanEur: profile.ibanEur,
  };
}

export function SupplierProfileForm({
  profile,
  onSubmit,
  onCancel,
  submitLabel,
}: SupplierProfileFormProps) {
  const [values, setValues] = useState<SupplierProfileFormValues>(() =>
    profile ? profileToFormValues(profile) : emptyValues
  );
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof SupplierProfileFormValues>(
    field: K,
    value: SupplierProfileFormValues[K]
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateSupplierProfileInput(values);
    if (validationError) {
      setError(validationError);
      return;
    }
    onSubmit(values);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Назва профілю (для списку)">
          <Input
            className="h-9"
            value={values.label}
            onChange={(event) => updateField("label", event.target.value)}
            placeholder="Напр. Основний ФОП"
          />
        </Field>
        <Field label="ІПН">
          <Input
            className="h-9 wf-mono"
            value={values.taxId}
            onChange={(event) => updateField("taxId", event.target.value)}
            inputMode="numeric"
            autoComplete="off"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Назва (EN)">
          <Input
            className="h-9"
            value={values.nameEn}
            onChange={(event) => updateField("nameEn", event.target.value)}
          />
        </Field>
        <Field label="Назва (UA)">
          <Input
            className="h-9"
            value={values.nameUa}
            onChange={(event) => updateField("nameUa", event.target.value)}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Адреса (EN)">
          <Textarea
            value={values.addressEn}
            onChange={(event) => updateField("addressEn", event.target.value)}
            rows={3}
          />
        </Field>
        <Field label="Адреса (UA)">
          <Textarea
            value={values.addressUa}
            onChange={(event) => updateField("addressUa", event.target.value)}
            rows={3}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Банк">
          <Input
            className="h-9"
            value={values.bankName}
            onChange={(event) => updateField("bankName", event.target.value)}
          />
        </Field>
        <Field label="SWIFT / BIC">
          <Input
            className="h-9 wf-mono uppercase"
            value={values.swift}
            onChange={(event) => updateField("swift", event.target.value)}
            autoComplete="off"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="IBAN (USD)">
          <Input
            className="h-9 wf-mono uppercase"
            value={values.ibanUsd}
            onChange={(event) => updateField("ibanUsd", event.target.value)}
            autoComplete="off"
          />
        </Field>
        <Field label="IBAN (EUR)">
          <Input
            className="h-9 wf-mono uppercase"
            value={values.ibanEur}
            onChange={(event) => updateField("ibanEur", event.target.value)}
            autoComplete="off"
          />
        </Field>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit">
          {submitLabel ?? (profile ? "Зберегти зміни" : "Створити профіль")}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Скасувати
          </Button>
        ) : null}
      </div>
    </form>
  );
}

type FieldProps = {
  label: string;
  children: React.ReactElement<{ id?: string }>;
};

function Field({ label, children }: FieldProps) {
  const id = useId();

  return (
    <div className="space-y-1.5">
      <Label className="wf-label text-wf-text-2" htmlFor={id}>
        {label}
      </Label>
      {cloneElement(children, { id })}
    </div>
  );
}
