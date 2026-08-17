"use client";

import type { DocType } from "@/lib/document-session/types";

type PreviewKind = "invoice" | "act";

function previewsForDocType(docType: DocType): PreviewKind[] {
  if (docType === "invoice") return ["invoice"];
  if (docType === "act") return ["act"];
  return ["invoice", "act"];
}

const LABELS: Record<PreviewKind, string> = {
  invoice: "Рахунок",
  act: "Акт",
};

type Props = {
  guid: string;
  docType: DocType;
  isPending?: boolean;
  onReopenEdit: () => void;
};

export function PdfExportStep({
  guid,
  docType,
  isPending = false,
  onReopenEdit,
}: Props) {
  const kinds = previewsForDocType(docType);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm" style={{ color: "var(--wizard-muted)" }}>
        Документ готовий. Завантажте PDF або поверніться до редагування.
        Вміст на цьому кроці не редагується.
      </p>

      <div
        className={
          kinds.length > 1
            ? "flex flex-col gap-8 lg:grid lg:grid-cols-2 lg:gap-6"
            : "flex flex-col gap-4"
        }
      >
        {kinds.map((kind) => (
          <figure key={kind} className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <figcaption
                className="text-sm font-semibold"
                style={{ color: "var(--wizard-text)" }}
              >
                {LABELS[kind]}
              </figcaption>
              <a
                href={`/api/docs/${guid}/pdf?type=${kind}`}
                className="wizard-btn wizard-btn-primary"
                download
              >
                Завантажити PDF
              </a>
            </div>
            <iframe
              title={`Прев’ю: ${LABELS[kind]}`}
              src={`/api/docs/${guid}/preview?type=${kind}`}
              className="h-[70vh] w-full rounded-[var(--wizard-radius)] border bg-white"
              style={{ borderColor: "var(--wizard-border)" }}
              sandbox=""
              referrerPolicy="no-referrer"
            />
          </figure>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          className="wizard-btn wizard-btn-secondary"
          disabled={isPending}
          onClick={onReopenEdit}
        >
          Назад
        </button>
        <button
          type="button"
          className="wizard-btn wizard-btn-secondary"
          disabled={isPending}
          onClick={onReopenEdit}
        >
          Редагувати
        </button>
      </div>
    </div>
  );
}
