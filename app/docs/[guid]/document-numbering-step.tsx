"use client";

import { useEffect, useEffectEvent, useState, useTransition } from "react";
import type { DocType, DocumentSession } from "@/lib/document-session/types";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateInput(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

type Props = {
  guid: string;
  docType: DocType;
  initialDate: string;
  initialInvoiceNumber?: string;
  initialActNumber?: string;
  onSessionUpdated?: (session: DocumentSession) => void;
  onDateValidityChange?: (valid: boolean) => void;
  onIssueRequest?: (issue: () => Promise<DocumentSession | null>) => void;
};

export function DocumentNumberingStep({
  guid,
  docType,
  initialDate,
  initialInvoiceNumber,
  initialActNumber,
  onSessionUpdated,
  onDateValidityChange,
  onIssueRequest,
}: Props) {
  const [date, setDate] = useState(initialDate);
  const [invoiceNumber, setInvoiceNumber] = useState(initialInvoiceNumber);
  const [actNumber, setActNumber] = useState(initialActNumber);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const showInvoice = docType === "invoice" || docType === "invoice_act";
  const showAct = docType === "act" || docType === "invoice_act";

  const reportValidity = useEffectEvent((valid: boolean) => {
    onDateValidityChange?.(valid);
  });

  const notifyUpdated = useEffectEvent((session: DocumentSession) => {
    onSessionUpdated?.(session);
  });

  const registerIssue = useEffectEvent(
    (issue: () => Promise<DocumentSession | null>) => {
      onIssueRequest?.(issue);
    },
  );

  useEffect(() => {
    reportValidity(isValidDateInput(date));
  }, [date]);

  useEffect(() => {
    registerIssue(async () => {
      if (!isValidDateInput(date)) {
        setError("Вкажіть коректну дату документа");
        reportValidity(false);
        return null;
      }
      setError(null);
      const res = await fetch(`/api/docs/${guid}/issue-numbers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(
          data?.error ?? `Не вдалося видати номери (${res.status})`,
        );
        return null;
      }
      const session = (await res.json()) as DocumentSession;
      setDate(session.date);
      setInvoiceNumber(session["invoice-number"]);
      setActNumber(session["act-number"]);
      notifyUpdated(session);
      return session;
    });
  }, [guid, date]);

  function applySession(session: DocumentSession) {
    setDate(session.date);
    setInvoiceNumber(session["invoice-number"]);
    setActNumber(session["act-number"]);
    notifyUpdated(session);
  }

  function saveDate(next: string) {
    setDate(next);
    const valid = isValidDateInput(next);
    onDateValidityChange?.(valid);
    if (!valid) {
      setError("Вкажіть коректну дату документа");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/docs/${guid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: next }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? `Не вдалося зберегти дату (${res.status})`);
        return;
      }
      const session = (await res.json()) as DocumentSession;
      applySession(session);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label
          htmlFor="document-date"
          className="text-lg font-semibold"
          style={{ color: "var(--wizard-text)" }}
        >
          Дата документа
        </label>
        <p className="mt-1 text-sm" style={{ color: "var(--wizard-muted)" }}>
          Номери рахунку та акта буде присвоєно після натискання «Далі».
        </p>
        <input
          id="document-date"
          type="date"
          value={date}
          onChange={(e) => saveDate(e.target.value)}
          disabled={isPending}
          className="mt-4 rounded-[var(--wizard-radius)] border px-3 py-2 text-sm"
          style={{
            borderColor: "var(--wizard-border)",
            color: "var(--wizard-text)",
            background: "var(--wizard-surface)",
          }}
        />
      </div>

      {showInvoice || showAct ? (
        <div className="flex flex-col gap-3">
          <h3
            className="text-sm font-medium"
            style={{ color: "var(--wizard-text)" }}
          >
            Номери документів
          </h3>
          {showInvoice ? (
            <div>
              <p
                className="text-xs uppercase tracking-wide"
                style={{ color: "var(--wizard-muted)" }}
              >
                Номер рахунку
              </p>
              <p
                className="mt-1 font-mono text-sm"
                style={{ color: "var(--wizard-text)" }}
              >
                {invoiceNumber ?? "Буде присвоєно на «Далі»"}
              </p>
            </div>
          ) : null}
          {showAct ? (
            <div>
              <p
                className="text-xs uppercase tracking-wide"
                style={{ color: "var(--wizard-muted)" }}
              >
                Номер акта
              </p>
              <p
                className="mt-1 font-mono text-sm"
                style={{ color: "var(--wizard-text)" }}
              >
                {actNumber ?? "Буде присвоєно на «Далі»"}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
