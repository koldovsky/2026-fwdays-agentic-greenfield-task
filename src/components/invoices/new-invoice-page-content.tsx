"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import {
  InvoiceForm,
  type InvoicePreviewState,
} from "@/components/invoices/invoice-form";
import { InvoicePreviewPanel } from "@/components/invoices/invoice-preview-panel";
import { Button } from "@/components/ui/button";
import {
  getActiveProfile,
  getServerActiveProfile,
  subscribeSupplierProfiles,
} from "@/lib/storage/supplier-profiles";
import {
  getClientsServerSnapshot,
  listClients,
  subscribeClients,
} from "@/lib/storage/clients";

const PREVIEW_DEBOUNCE_MS = 150;

const EMPTY_PREVIEW: InvoicePreviewState = {
  html: null,
  invoiceNumber: null,
  error: null,
  isPending: false,
};

type DebouncedPreview = {
  html: string | null;
  invoiceNumber: string | null;
};

const EMPTY_DEBOUNCED_PREVIEW: DebouncedPreview = {
  html: null,
  invoiceNumber: null,
};

export function NewInvoicePageContent() {
  const supplier = useSyncExternalStore(
    subscribeSupplierProfiles,
    getActiveProfile,
    getServerActiveProfile
  );
  const clients = useSyncExternalStore(
    subscribeClients,
    listClients,
    getClientsServerSnapshot
  );

  const [preview, setPreview] = useState<InvoicePreviewState>(EMPTY_PREVIEW);
  const [debouncedPreview, setDebouncedPreview] = useState<DebouncedPreview>(
    EMPTY_DEBOUNCED_PREVIEW
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedPreview({
        html: preview.html,
        invoiceNumber: preview.invoiceNumber,
      });
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [preview.html, preview.invoiceNumber]);

  const handlePreviewChange = useCallback((state: InvoicePreviewState) => {
    setPreview((prev) =>
      prev.html === state.html &&
      prev.invoiceNumber === state.invoiceNumber &&
      prev.error === state.error &&
      prev.isPending === state.isPending
        ? prev
        : state
    );
  }, []);

  const exportDisabled =
    preview.isPending ||
    preview.error !== null ||
    debouncedPreview.html === null ||
    debouncedPreview.invoiceNumber === null;

  const exportDisabledReason = preview.error
    ? "Виправте помилки перед експортом."
    : preview.isPending
      ? "Зачекайте, поки оновиться попередній перегляд."
      : "Заповніть форму, щоб увімкнути експорт.";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="wf-display">Новий рахунок</h1>
        <p className="mt-1 text-wf-text-2">
          Заповніть форму або вставте короткий формат — попередній перегляд
          оновиться автоматично.
        </p>
      </div>

      {!supplier ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-wf-text-1">
            Щоб створити рахунок, спочатку додайте профіль постачальника з
            банківськими реквізитами.
          </p>
          <Button
            nativeButton={false}
            render={<Link href="/settings" />}
            className="mt-3"
          >
            Перейти до налаштувань
          </Button>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="min-w-0">
          <InvoiceForm
            supplier={supplier}
            clients={clients}
            onPreviewChange={handlePreviewChange}
          />
        </div>

        <div className="min-w-0 space-y-3">
          {preview.error ? (
            <p
              className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {preview.error}
              {preview.error.includes("IBAN") ? (
                <>
                  {" "}
                  <Link href="/settings" className="underline underline-offset-2">
                    Налаштування → профіль постачальника
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}
          <InvoicePreviewPanel
            html={debouncedPreview.html}
            invoiceNumber={debouncedPreview.invoiceNumber}
            isPending={preview.isPending}
            exportDisabled={exportDisabled}
            exportDisabledReason={exportDisabledReason}
          />
        </div>
      </div>
    </div>
  );
}
