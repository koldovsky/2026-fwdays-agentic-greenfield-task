"use client";

import { useState, useTransition } from "react";
import type { DocType, DocumentSession } from "@/lib/document-session/types";

const DOC_TYPE_OPTIONS: { value: DocType; label: string }[] = [
  { value: "invoice_act", label: "Рахунок + акт" },
  { value: "invoice", label: "Рахунок" },
  { value: "act", label: "Акт" },
];

type Props = {
  guid: string;
  initialDocType: DocType;
  initialCopiedFrom?: string;
  onSessionUpdated?: (session: DocumentSession) => void;
  onCopyFieldChange?: (hasPendingCopyGuid: boolean) => void;
};

export function DocumentTypeStep({
  guid,
  initialDocType,
  initialCopiedFrom,
  onSessionUpdated,
  onCopyFieldChange,
}: Props) {
  const [docType, setDocType] = useState<DocType>(initialDocType);
  const [sourceGuid, setSourceGuid] = useState("");
  const [copiedFrom, setCopiedFrom] = useState(initialCopiedFrom);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateSourceGuid(value: string) {
    setSourceGuid(value);
    onCopyFieldChange?.(value.trim() !== "");
  }

  function saveDocType(next: DocType) {
    const previous = docType;
    setDocType(next);
    setError(null);
    setCopySuccess(null);
    startTransition(async () => {
      const res = await fetch(`/api/docs/${guid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "doc-type": next }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setDocType(previous);
        setError(data?.error ?? `Не вдалося зберегти тип (${res.status})`);
        return;
      }
      const session = (await res.json()) as DocumentSession;
      setDocType(session["doc-type"]);
      onSessionUpdated?.(session);
    });
  }

  function handleCopy() {
    const trimmed = sourceGuid.trim();
    if (!trimmed) {
      setError("Вкажіть guid сеансу для копіювання");
      setCopySuccess(null);
      return;
    }
    setError(null);
    setCopySuccess(null);
    startTransition(async () => {
      const res = await fetch(`/api/docs/${guid}/copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "source-guid": trimmed }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(
          data?.error ?? `Не вдалося скопіювати дані (${res.status})`,
        );
        return;
      }
      const session = (await res.json()) as DocumentSession;
      setDocType(session["doc-type"]);
      setCopiedFrom(session["copied-from"]);
      setSourceGuid("");
      onCopyFieldChange?.(false);
      setCopySuccess("Дані скопійовано (номери документів не перенесено)");
      onSessionUpdated?.(session);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <fieldset disabled={isPending} className="border-0 p-0">
        <legend
          className="text-lg font-semibold"
          style={{ color: "var(--wizard-text)" }}
        >
          Тип документа
        </legend>
        <p className="mt-1 text-sm" style={{ color: "var(--wizard-muted)" }}>
          Оберіть, які документи потрібно сформувати.
        </p>
        <div className="mt-4 flex flex-col gap-3" role="radiogroup">
          {DOC_TYPE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-3 text-sm"
              style={{ color: "var(--wizard-text)" }}
            >
              <input
                type="radio"
                name="doc-type"
                value={option.value}
                checked={docType === option.value}
                onChange={() => saveDocType(option.value)}
                className="h-4 w-4 accent-[var(--wizard-accent)]"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label
          htmlFor="copy-from-guid"
          className="text-sm font-medium"
          style={{ color: "var(--wizard-text)" }}
        >
          Скопіювати з іншого сеансу (необов’язково)
        </label>
        <p className="mt-1 text-sm" style={{ color: "var(--wizard-muted)" }}>
          Дані контакту, послуг і типу буде перенесено; номери рахунку/акта — ні.
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            id="copy-from-guid"
            type="text"
            value={sourceGuid}
            onChange={(e) => updateSourceGuid(e.target.value)}
            placeholder="guid сеансу"
            disabled={isPending}
            className="min-w-0 flex-1 rounded-[var(--wizard-radius)] border px-3 py-2 font-mono text-sm"
            style={{
              borderColor: "var(--wizard-border)",
              color: "var(--wizard-text)",
              background: "var(--wizard-surface)",
            }}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            className="wizard-btn wizard-btn-secondary shrink-0"
            disabled={isPending}
            onClick={handleCopy}
          >
            Скопіювати
          </button>
        </div>
        {copiedFrom ? (
          <p
            className="mt-2 font-mono text-xs"
            style={{ color: "var(--wizard-muted)" }}
          >
            Скопійовано з: {copiedFrom}
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {copySuccess ? (
        <p className="text-sm text-green-800" role="status">
          {copySuccess}
        </p>
      ) : null}
    </div>
  );
}
