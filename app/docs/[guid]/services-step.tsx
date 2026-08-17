"use client";

import { useEffect, useEffectEvent, useState, useTransition } from "react";
import type {
  DocumentSession,
  ServiceLine,
  WizardStep,
} from "@/lib/document-session/types";
import type { CatalogServiceEntry } from "@/lib/services-catalog";

type DraftLine = {
  "sign-name": string;
  "service-name": string;
  amount: string;
  price: string;
};

const EMPTY_LINE: DraftLine = {
  "sign-name": "",
  "service-name": "",
  amount: "",
  price: "",
};

function toDraft(line: ServiceLine): DraftLine {
  return {
    "sign-name": line["sign-name"],
    "service-name": line["service-name"],
    amount: String(line.amount),
    price: String(line.price),
  };
}

function parseNumber(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function validateLines(rows: DraftLine[]): string | null {
  if (rows.length === 0) {
    return "Додайте хоча б одну послугу";
  }
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const label = `Рядок ${i + 1}`;
    if (!row["sign-name"].trim()) {
      return `${label}: заповніть коротке ім’я (sign-name)`;
    }
    if (!row["service-name"].trim()) {
      return `${label}: заповніть назву послуги`;
    }
    const amount = parseNumber(row.amount);
    if (amount === null || !(amount > 0)) {
      return `${label}: кількість має бути числом більше нуля`;
    }
    const price = parseNumber(row.price);
    if (price === null || price < 0) {
      return `${label}: ціна має бути числом не менше нуля`;
    }
  }
  return null;
}

function normalizeLines(rows: DraftLine[]): ServiceLine[] {
  return rows.map((row) => ({
    "sign-name": row["sign-name"].trim(),
    "service-name": row["service-name"].trim(),
    amount: parseNumber(row.amount)!,
    price: parseNumber(row.price)!,
  }));
}

type Props = {
  guid: string;
  initialServices?: ServiceLine[];
  onSessionUpdated?: (session: DocumentSession) => void;
  onSaveRequest?: (
    save: (nextStep: WizardStep) => Promise<DocumentSession | null>,
  ) => void;
};

export function ServicesStep({
  guid,
  initialServices,
  onSessionUpdated,
  onSaveRequest,
}: Props) {
  const [rows, setRows] = useState<DraftLine[]>(() =>
    initialServices && initialServices.length > 0
      ? initialServices.map(toDraft)
      : [{ ...EMPTY_LINE }],
  );
  const [catalog, setCatalog] = useState<CatalogServiceEntry[]>([]);
  const [query, setQuery] = useState("");
  const [activeRow, setActiveRow] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const notifyUpdated = useEffectEvent((session: DocumentSession) => {
    onSessionUpdated?.(session);
  });

  const registerSave = useEffectEvent(
    (save: (nextStep: WizardStep) => Promise<DocumentSession | null>) => {
      onSaveRequest?.(save);
    },
  );

  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      const res = await fetch("/api/jobs/services");
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as CatalogServiceEntry[];
      if (!cancelled) setCatalog(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    registerSave(async (nextStep) => {
      const validationError = validateLines(rows);
      if (validationError) {
        setError(validationError);
        return null;
      }
      const services = normalizeLines(rows);
      setError(null);

      const currentRes = await fetch("/api/jobs/services");
      if (!currentRes.ok) {
        const data = (await currentRes.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(
          data?.error ??
            `Не вдалося прочитати каталог послуг (${currentRes.status})`,
        );
        return null;
      }
      const currentCatalog = (await currentRes.json()) as CatalogServiceEntry[];
      const bySign = new Map(
        currentCatalog.map((e) => [e["sign-name"], e] as const),
      );
      for (const line of services) {
        bySign.set(line["sign-name"], {
          "sign-name": line["sign-name"],
          "service-name": line["service-name"],
          amount: line.amount,
          price: line.price,
        });
      }

      const putRes = await fetch("/api/jobs/services", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([...bySign.values()]),
      });
      if (!putRes.ok) {
        const data = (await putRes.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(
          data?.error ??
            `Не вдалося зберегти каталог послуг (${putRes.status})`,
        );
        return null;
      }
      const savedCatalog = (await putRes.json()) as CatalogServiceEntry[];
      setCatalog(savedCatalog);

      const patchRes = await fetch(`/api/docs/${guid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          services,
          "current-step": nextStep,
        }),
      });
      if (!patchRes.ok) {
        const data = (await patchRes.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(
          data?.error ??
            `Не вдалося зберегти сеанс (${patchRes.status})`,
        );
        return null;
      }
      const session = (await patchRes.json()) as DocumentSession;
      notifyUpdated(session);
      return session;
    });
  }, [guid, rows]);

  function updateRow(index: number, patch: Partial<DraftLine>) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
    setError(null);
  }

  function addRow() {
    setRows((prev) => [...prev, { ...EMPTY_LINE }]);
    setActiveRow(rows.length);
    setError(null);
  }

  function removeRow(index: number) {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
    setActiveRow((prev) => Math.max(0, Math.min(prev, rows.length - 2)));
    setError(null);
  }

  function selectCatalogEntry(entry: CatalogServiceEntry) {
    const index = Math.min(activeRow, rows.length - 1);
    updateRow(index, {
      "sign-name": entry["sign-name"],
      "service-name": entry["service-name"],
      amount:
        entry.amount !== undefined ? String(entry.amount) : rows[index]?.amount ?? "",
      price:
        entry.price !== undefined ? String(entry.price) : rows[index]?.price ?? "",
    });
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? catalog.filter(
        (e) =>
          e["sign-name"].toLowerCase().includes(q) ||
          e["service-name"].toLowerCase().includes(q),
      )
    : catalog;

  const inputStyle = {
    borderColor: "var(--wizard-border)",
    color: "var(--wizard-text)",
    background: "var(--wizard-surface)",
  } as const;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2
          className="text-lg font-semibold"
          style={{ color: "var(--wizard-text)" }}
        >
          Послуги
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--wizard-muted)" }}>
          Оберіть послугу з каталогу або заповніть рядок. Потрібна хоча б одна
          послуга з кількістю та ціною.
        </p>
      </div>

      <div>
        <label
          htmlFor="services-search"
          className="text-sm font-medium"
          style={{ color: "var(--wizard-text)" }}
        >
          Пошук у каталозі
        </label>
        <input
          id="services-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Коротке ім’я або назва"
          disabled={isPending}
          className="mt-2 w-full rounded-[var(--wizard-radius)] border px-3 py-2 text-sm"
          style={inputStyle}
        />
        {filtered.length > 0 ? (
          <ul
            className="mt-2 max-h-40 overflow-y-auto rounded-[var(--wizard-radius)] border"
            style={{ borderColor: "var(--wizard-border)" }}
            role="listbox"
            aria-label="Каталог послуг"
          >
            {filtered.map((entry) => (
              <li key={entry["sign-name"]}>
                <button
                  type="button"
                  role="option"
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-[#eef0f3]"
                  style={{ color: "var(--wizard-text)" }}
                  onClick={() => selectCatalogEntry(entry)}
                  disabled={isPending}
                >
                  <span className="font-medium">{entry["service-name"]}</span>
                  <span
                    className="font-mono text-xs"
                    style={{ color: "var(--wizard-muted)" }}
                  >
                    {entry["sign-name"]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm" style={{ color: "var(--wizard-muted)" }}>
            {catalog.length === 0
              ? "Каталог порожній — створіть послугу нижче."
              : "Нічого не знайдено за запитом."}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {rows.map((row, index) => (
          <fieldset
            key={index}
            className="flex flex-col gap-3 rounded-[var(--wizard-radius)] border p-4"
            style={{ borderColor: "var(--wizard-border)" }}
            disabled={isPending}
            onFocusCapture={() => setActiveRow(index)}
          >
            <legend
              className="px-1 text-sm font-medium"
              style={{ color: "var(--wizard-text)" }}
            >
              Рядок {index + 1}
            </legend>

            <div>
              <label
                htmlFor={`service-sign-${index}`}
                className="text-xs uppercase tracking-wide"
                style={{ color: "var(--wizard-muted)" }}
              >
                Коротке ім’я
              </label>
              <input
                id={`service-sign-${index}`}
                type="text"
                value={row["sign-name"]}
                onChange={(e) =>
                  updateRow(index, { "sign-name": e.target.value })
                }
                className="mt-1 w-full rounded-[var(--wizard-radius)] border px-3 py-2 text-sm"
                style={inputStyle}
              />
            </div>

            <div>
              <label
                htmlFor={`service-name-${index}`}
                className="text-xs uppercase tracking-wide"
                style={{ color: "var(--wizard-muted)" }}
              >
                Назва послуги
              </label>
              <input
                id={`service-name-${index}`}
                type="text"
                value={row["service-name"]}
                onChange={(e) =>
                  updateRow(index, { "service-name": e.target.value })
                }
                className="mt-1 w-full rounded-[var(--wizard-radius)] border px-3 py-2 text-sm"
                style={inputStyle}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor={`service-amount-${index}`}
                  className="text-xs uppercase tracking-wide"
                  style={{ color: "var(--wizard-muted)" }}
                >
                  Кількість
                </label>
                <input
                  id={`service-amount-${index}`}
                  type="text"
                  inputMode="decimal"
                  value={row.amount}
                  onChange={(e) => updateRow(index, { amount: e.target.value })}
                  className="mt-1 w-full rounded-[var(--wizard-radius)] border px-3 py-2 text-sm"
                  style={inputStyle}
                />
              </div>
              <div>
                <label
                  htmlFor={`service-price-${index}`}
                  className="text-xs uppercase tracking-wide"
                  style={{ color: "var(--wizard-muted)" }}
                >
                  Ціна
                </label>
                <input
                  id={`service-price-${index}`}
                  type="text"
                  inputMode="decimal"
                  value={row.price}
                  onChange={(e) => updateRow(index, { price: e.target.value })}
                  className="mt-1 w-full rounded-[var(--wizard-radius)] border px-3 py-2 text-sm"
                  style={inputStyle}
                />
              </div>
            </div>

            {rows.length > 1 ? (
              <button
                type="button"
                className="wizard-btn wizard-btn-secondary w-fit text-sm"
                onClick={() => removeRow(index)}
                disabled={isPending}
              >
                Видалити рядок
              </button>
            ) : null}
          </fieldset>
        ))}
      </div>

      <button
        type="button"
        className="wizard-btn wizard-btn-secondary w-fit"
        onClick={addRow}
        disabled={isPending}
      >
        додати ще
      </button>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
