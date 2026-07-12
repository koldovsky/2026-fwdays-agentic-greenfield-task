"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MissingIbanError } from "@/lib/banking/supplier-block";
import { formToRenderInput } from "@/lib/invoices/form-to-render";
import { matchNaceEntry } from "@/lib/nace/match";
import { naceCatalog } from "@/lib/nace/catalog";
import type { NaceEntry } from "@/lib/nace/types";
import { renderInvoice } from "@/lib/render/render-invoice";
import { clientToInvoiceCustomerFields } from "@/lib/storage/clients";
import {
  SHORT_FORMAT_EXAMPLE,
  emptyInvoiceFormValues,
  invoiceFormSchema,
  mergeShortFormatIntoForm,
  parseInvoiceFormValues,
  parseShortFormat,
  type InvoiceFormValues,
} from "@/lib/validation/invoice-input";
import type { Client } from "@/types/client";
import type { SupplierProfile } from "@/types/supplier";

export type InvoicePreviewState = {
  html: string | null;
  invoiceNumber: string | null;
  error: string | null;
  isPending: boolean;
};

type InvoiceFormProps = {
  supplier: SupplierProfile | null;
  clients: readonly Client[];
  onPreviewChange: (state: InvoicePreviewState) => void;
};

type NaceUiState =
  | { kind: "idle" }
  | { kind: "matched"; entry: NaceEntry }
  | { kind: "ambiguous"; candidates: NaceEntry[] }
  | { kind: "none" };

function findNaceEntryById(id: string): NaceEntry | null {
  return naceCatalog.find((entry) => entry.id === id) ?? null;
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }
  return (
    <p className="text-xs text-destructive" role="alert">
      {message}
    </p>
  );
}

export function InvoiceForm({
  supplier,
  clients,
  onPreviewChange,
}: InvoiceFormProps) {
  const [shortFormatText, setShortFormatText] = useState("");
  const [shortFormatError, setShortFormatError] = useState<string | null>(null);
  const [naceState, setNaceState] = useState<NaceUiState>({ kind: "idle" });

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: emptyInvoiceFormValues(),
    mode: "onChange",
  });

  const {
    register,
    watch,
    getValues,
    setValue,
    reset,
    formState: { errors },
  } = form;

  const clientId = watch("clientId");
  const currency = watch("currency");
  const naceEntryId = watch("naceEntryId");
  const serviceText = watch("serviceText");

  const resolveNaceFromServiceText = useCallback(
    (serviceText: string, selectedEntryId: string) => {
      const trimmed = serviceText.trim();
      if (trimmed.length === 0) {
        setNaceState({ kind: "idle" });
        setValue("naceEntryId", "", { shouldValidate: true });
        return;
      }

      if (selectedEntryId) {
        const selected = findNaceEntryById(selectedEntryId);
        if (selected) {
          setNaceState({ kind: "matched", entry: selected });
          return;
        }
      }

      const match = matchNaceEntry(trimmed);
      if (match.kind === "matched") {
        setNaceState({ kind: "matched", entry: match.entry });
        setValue("naceEntryId", match.entry.id, { shouldValidate: true });
        return;
      }
      if (match.kind === "ambiguous") {
        setNaceState({ kind: "ambiguous", candidates: match.candidates });
        setValue("naceEntryId", "", { shouldValidate: true });
        return;
      }
      setNaceState({ kind: "none" });
      setValue("naceEntryId", "", { shouldValidate: true });
    },
    [setValue]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      resolveNaceFromServiceText(serviceText, naceEntryId);
    }, 200);
    return () => {
      window.clearTimeout(timer);
    };
  }, [serviceText, naceEntryId, resolveNaceFromServiceText]);

  const selectedNaceEntry = useMemo(() => {
    if (naceState.kind === "matched") {
      return naceState.entry;
    }
    if (naceEntryId) {
      return findNaceEntryById(naceEntryId);
    }
    return null;
  }, [naceState, naceEntryId]);

  useEffect(() => {
    let timer: number | undefined;

    const updatePreview = () => {
      if (timer) {
        window.clearTimeout(timer);
        timer = undefined;
      }

      if (!supplier) {
        onPreviewChange({
          html: null,
          invoiceNumber: null,
          error:
            "Додайте профіль постачальника в Налаштуваннях, щоб побачити попередній перегляд.",
          isPending: false,
        });
        return;
      }

      const values = getValues();
      const parsed = parseInvoiceFormValues(values);
      if (parsed instanceof Error || !selectedNaceEntry) {
        onPreviewChange({
          html: null,
          invoiceNumber: null,
          error: null,
          isPending: false,
        });
        return;
      }

      onPreviewChange({
        html: null,
        invoiceNumber: null,
        error: null,
        isPending: true,
      });

      timer = window.setTimeout(() => {
        const currentValues = getValues();
        const currentParsed = parseInvoiceFormValues(currentValues);
        if (currentParsed instanceof Error || !selectedNaceEntry) {
          return;
        }

        try {
          const renderInput = formToRenderInput(currentParsed, {
            supplier,
            naceEntry: selectedNaceEntry,
          });
          const html = renderInvoice(renderInput);
          onPreviewChange({
            html,
            invoiceNumber: renderInput.invoiceNumber,
            error: null,
            isPending: false,
          });
        } catch (error) {
          if (error instanceof MissingIbanError) {
            onPreviewChange({
              html: null,
              invoiceNumber: null,
              error: error.message,
              isPending: false,
            });
            return;
          }
          const message =
            error instanceof Error
              ? error.message
              : "Не вдалося згенерувати попередній перегляд.";
          onPreviewChange({
            html: null,
            invoiceNumber: null,
            error: message,
            isPending: false,
          });
        }
      }, 150);
    };

    updatePreview();
    const subscription = watch(updatePreview);

    return () => {
      subscription.unsubscribe();
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [supplier, selectedNaceEntry, getValues, watch, onPreviewChange]);

  function handleClientSelect(clientId: string | null) {
    if (!clientId || clientId === "manual") {
      setValue("clientId", "", { shouldValidate: true });
      return;
    }

    const client = clients.find((item) => item.id === clientId);
    if (!client) {
      return;
    }

    const fields = clientToInvoiceCustomerFields(client);
    setValue("clientId", client.id, { shouldValidate: true });
    setValue("customerName", fields.customerName, { shouldValidate: true });
    setValue("customerAddress", fields.customerAddress1, {
      shouldValidate: true,
    });
    setValue("customerEmail", fields.customerEmail, { shouldValidate: true });
    setValue("customerPhone", fields.customerPhone, { shouldValidate: true });
    setValue("customerWebsite", fields.customerWebsite, {
      shouldValidate: true,
    });
  }

  function handleApplyShortFormat() {
    const partial = parseShortFormat(shortFormatText);
    if (Object.keys(partial).length === 0) {
      setShortFormatError(
        "Не знайдено жодного рядка у форматі key: value. Приклад див. нижче."
      );
      return;
    }

    setShortFormatError(null);
    reset(mergeShortFormatIntoForm(getValues(), partial));
  }

  function handleNaceCandidateSelect(entryId: string) {
    const entry = findNaceEntryById(entryId);
    if (!entry) {
      return;
    }
    setValue("naceEntryId", entry.id, { shouldValidate: true });
    setNaceState({ kind: "matched", entry });
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <div>
          <h2 className="text-sm font-medium text-wf-text-1">Швидке вставлення</h2>
          <p className="mt-1 text-xs text-wf-text-2">
            Вставте блок key: value — поля форми заповняться автоматично.
          </p>
        </div>
        <Textarea
          value={shortFormatText}
          onChange={(event) => setShortFormatText(event.target.value)}
          placeholder={SHORT_FORMAT_EXAMPLE}
          className="min-h-32 font-mono text-xs"
          aria-label="Швидке вставлення key: value"
        />
        {shortFormatError ? (
          <p className="text-xs text-destructive" role="alert">
            {shortFormatError}
          </p>
        ) : null}
        <Button type="button" variant="outline" onClick={handleApplyShortFormat}>
          Застосувати
        </Button>
      </section>

      <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
        <div className="grid gap-2">
          <Label htmlFor="invoice-client" className="wf-label">
            Клієнт з довідника
          </Label>
          <Select
            value={clientId || "manual"}
            onValueChange={handleClientSelect}
          >
            <SelectTrigger id="invoice-client" className="h-9 w-full">
              <SelectValue placeholder="Оберіть клієнта" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Ввести вручну</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="customerName" className="wf-label">
            Назва клієнта
          </Label>
          <Input id="customerName" className="h-9" {...register("customerName")} />
          <FieldError message={errors.customerName?.message} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="customerAddress" className="wf-label">
            Адреса
          </Label>
          <Input
            id="customerAddress"
            className="h-9"
            {...register("customerAddress")}
          />
          <FieldError message={errors.customerAddress?.message} />
        </div>

        <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
          <div className="grid gap-2">
            <Label htmlFor="customerEmail" className="wf-label">
              Email
            </Label>
            <Input
              id="customerEmail"
              type="email"
              className="h-9"
              {...register("customerEmail")}
            />
            <FieldError message={errors.customerEmail?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="customerPhone" className="wf-label">
              Телефон
            </Label>
            <Input
              id="customerPhone"
              type="tel"
              className="h-9"
              {...register("customerPhone")}
            />
            <FieldError message={errors.customerPhone?.message} />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="customerWebsite" className="wf-label">
            Вебсайт
          </Label>
          <Input
            id="customerWebsite"
            className="h-9"
            placeholder="https://"
            {...register("customerWebsite")}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
          <div className="grid gap-2">
            <Label htmlFor="currency" className="wf-label">
              Валюта
            </Label>
            <Select
              value={currency}
              onValueChange={(value) => {
                if (value === "USD" || value === "EUR") {
                  setValue("currency", value, { shouldValidate: true });
                }
              }}
            >
              <SelectTrigger id="currency" className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
            <FieldError message={errors.currency?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="issueDate" className="wf-label">
              Дата рахунку
            </Label>
            <Input id="issueDate" type="date" className="h-9" {...register("issueDate")} />
            <FieldError message={errors.issueDate?.message} />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="serviceText" className="wf-label">
            Послуга
          </Label>
          <Input id="serviceText" className="h-9" {...register("serviceText")} />
          <FieldError message={errors.serviceText?.message} />
          {naceState.kind === "matched" ? (
            <p className="text-xs text-wf-text-2">
              Класифікація: {naceState.entry.lineTextUa} ({naceState.entry.naceClass})
            </p>
          ) : null}
          {naceState.kind === "ambiguous" ? (
            <div className="space-y-2 rounded-md border border-border bg-wf-surface-2 p-3">
              <p className="text-xs text-wf-text-1">
                Знайдено кілька варіантів. Оберіть правильну послугу:
              </p>
              <div className="space-y-2">
                {naceState.candidates.map((candidate) => (
                  <label
                    key={candidate.id}
                    className="flex cursor-pointer items-start gap-2 text-sm"
                  >
                    <input
                      type="radio"
                      name="nace-candidate"
                      checked={naceEntryId === candidate.id}
                      onChange={() => handleNaceCandidateSelect(candidate.id)}
                      className="mt-1"
                    />
                    <span>
                      {candidate.lineTextUa}
                      <span className="block text-xs text-wf-text-2">
                        {candidate.lineTextEn} · {candidate.naceClass}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          {naceState.kind === "none" ? (
            <p className="text-xs text-destructive" role="alert">
              Не вдалося визначити послугу за описом. Уточніть текст, наприклад:
              «логотип», «відеомонтаж» або «3d візуалізація».
            </p>
          ) : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-3 sm:gap-4">
          <div className="grid gap-2">
            <Label htmlFor="quantity" className="wf-label">
              Кількість
            </Label>
            <Input id="quantity" className="h-9" inputMode="numeric" {...register("quantity")} />
            <FieldError message={errors.quantity?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="unitPriceInput" className="wf-label">
              Ціна за одиницю
            </Label>
            <Input
              id="unitPriceInput"
              className="h-9 wf-mono"
              inputMode="decimal"
              {...register("unitPriceInput")}
            />
            <FieldError message={errors.unitPriceInput?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="prepaymentPercent" className="wf-label">
              Передоплата (%)
            </Label>
            <Input
              id="prepaymentPercent"
              className="h-9"
              inputMode="numeric"
              {...register("prepaymentPercent")}
            />
            <FieldError message={errors.prepaymentPercent?.message} />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
          <div className="grid gap-2">
            <Label htmlFor="paymentDays" className="wf-label">
              Термін оплати (днів)
            </Label>
            <Input
              id="paymentDays"
              className="h-9"
              inputMode="numeric"
              {...register("paymentDays")}
            />
            <FieldError message={errors.paymentDays?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="executionDays" className="wf-label">
              Термін виконання (днів)
            </Label>
            <Input
              id="executionDays"
              className="h-9"
              inputMode="numeric"
              {...register("executionDays")}
            />
            <FieldError message={errors.executionDays?.message} />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="projectName" className="wf-label">
            Назва проєкту (необов&apos;язково)
          </Label>
          <Input id="projectName" className="h-9" {...register("projectName")} />
        </div>

        {!supplier ? (
          <p className="text-sm text-destructive" role="alert">
            Немає активного профілю постачальника.{" "}
            <Link href="/settings" className="underline underline-offset-2">
              Перейдіть до налаштувань
            </Link>
            , щоб додати профіль.
          </p>
        ) : null}
      </form>
    </div>
  );
}
