"use client";

import { useId, type FormEvent } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Client, ClientInput } from "@/types/client";

export type ClientFormValues = ClientInput;

export const emptyClientFormValues = (): ClientFormValues => ({
  name: "",
  address: "",
  email: "",
  phone: "",
  website: "",
  company: "",
  taxId: "",
});

export function clientToFormValues(client: Client): ClientFormValues {
  return {
    id: client.id,
    name: client.name,
    address: client.address,
    email: client.email,
    phone: client.phone,
    website: client.website,
    company: client.company ?? "",
    taxId: client.taxId ?? "",
  };
}

type ClientFormProps = {
  values: ClientFormValues;
  onChange: (values: ClientFormValues) => void;
  onSubmit: () => void;
  formId?: string;
  idPrefix?: string;
};

export function ClientForm({
  values,
  onChange,
  onSubmit,
  formId,
  idPrefix,
}: ClientFormProps) {
  const generatedPrefix = useId();
  const prefix = idPrefix ?? generatedPrefix;

  function updateField<K extends keyof ClientFormValues>(
    field: K,
    value: ClientFormValues[K]
  ) {
    onChange({ ...values, [field]: value });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className="grid gap-4" id={formId} onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <Label htmlFor={`${prefix}-name`} className="wf-label">
          Ім&apos;я / назва
        </Label>
        <Input
          id={`${prefix}-name`}
          className="h-9"
          value={values.name}
          onChange={(event) => updateField("name", event.target.value)}
          autoComplete="name"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${prefix}-company`} className="wf-label">
          Компанія (необов&apos;язково)
        </Label>
        <Input
          id={`${prefix}-company`}
          className="h-9"
          value={values.company ?? ""}
          onChange={(event) => updateField("company", event.target.value)}
          autoComplete="organization"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${prefix}-address`} className="wf-label">
          Адреса
        </Label>
        <Input
          id={`${prefix}-address`}
          className="h-9"
          value={values.address}
          onChange={(event) => updateField("address", event.target.value)}
          autoComplete="street-address"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${prefix}-email`} className="wf-label">
          Email
        </Label>
        <Input
          id={`${prefix}-email`}
          className="h-9"
          type="email"
          value={values.email}
          onChange={(event) => updateField("email", event.target.value)}
          autoComplete="email"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${prefix}-phone`} className="wf-label">
          Телефон
        </Label>
        <Input
          id={`${prefix}-phone`}
          className="h-9"
          type="tel"
          value={values.phone}
          onChange={(event) => updateField("phone", event.target.value)}
          autoComplete="tel"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${prefix}-website`} className="wf-label">
          Вебсайт
        </Label>
        <Input
          id={`${prefix}-website`}
          className="h-9"
          type="url"
          value={values.website}
          onChange={(event) => updateField("website", event.target.value)}
          autoComplete="url"
          placeholder="https://"
        />
      </div>
    </form>
  );
}
