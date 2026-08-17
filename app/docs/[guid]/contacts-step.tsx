"use client";

import { useEffect, useEffectEvent, useState, useTransition } from "react";
import type {
  ContactRef,
  DocumentSession,
  WizardStep,
} from "@/lib/document-session/types";

export type ContactRole = "client" | "done-by";

const EMPTY_CONTACT: ContactRef = {
  "full-name": "",
  inn: "",
  phone: "",
  acc: "",
  bank: "",
  "mfo-bank": "",
  addr: "",
};

const FIELD_LABELS: { key: keyof ContactRef; label: string }[] = [
  { key: "full-name", label: "Повне ім’я / назва" },
  { key: "inn", label: "РНОКПП" },
  { key: "phone", label: "Телефон" },
  { key: "acc", label: "Рахунок (IBAN)" },
  { key: "bank", label: "Банк" },
  { key: "mfo-bank", label: "МФО банку" },
  { key: "addr", label: "Адреса" },
];

function roleTitle(role: ContactRole): string {
  return role === "client" ? "Замовник" : "Виконавець";
}

function validateContact(form: ContactRef): string | null {
  for (const { key, label } of FIELD_LABELS) {
    if (!form[key].trim()) {
      return `Заповніть поле «${label}»`;
    }
  }
  const inn = form.inn.trim();
  if (inn.includes("/") || inn.includes("\\") || inn.includes("..")) {
    return "РНОКПП містить недопустимі символи";
  }
  return null;
}

function normalizeForm(form: ContactRef): ContactRef {
  return {
    "full-name": form["full-name"].trim(),
    inn: form.inn.trim(),
    phone: form.phone.trim(),
    acc: form.acc.trim(),
    bank: form.bank.trim(),
    "mfo-bank": form["mfo-bank"].trim(),
    addr: form.addr.trim(),
  };
}

type Props = {
  guid: string;
  role: ContactRole;
  initialContact?: ContactRef;
  onSessionUpdated?: (session: DocumentSession) => void;
  onSaveRequest?: (
    save: (nextStep: WizardStep) => Promise<DocumentSession | null>,
  ) => void;
};

export function ContactsStep({
  guid,
  role,
  initialContact,
  onSessionUpdated,
  onSaveRequest,
}: Props) {
  const [form, setForm] = useState<ContactRef>(
    () => initialContact ?? EMPTY_CONTACT,
  );
  const [catalog, setCatalog] = useState<ContactRef[]>([]);
  const [query, setQuery] = useState("");
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
      const res = await fetch("/api/contacts");
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as ContactRef[];
      if (!cancelled) setCatalog(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    registerSave(async (nextStep) => {
      const validationError = validateContact(form);
      if (validationError) {
        setError(validationError);
        return null;
      }
      const contact = normalizeForm(form);
      setError(null);

      const putRes = await fetch(
        `/api/contacts/${encodeURIComponent(contact.inn)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(contact),
        },
      );
      if (!putRes.ok) {
        const data = (await putRes.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(
          data?.error ?? `Не вдалося зберегти контакт (${putRes.status})`,
        );
        return null;
      }
      const saved = (await putRes.json()) as ContactRef;
      setForm(saved);
      setCatalog((prev) => {
        const without = prev.filter((c) => c.inn !== saved.inn);
        return [...without, saved].toSorted((a, b) =>
          a.inn.localeCompare(b.inn),
        );
      });

      const patchRes = await fetch(`/api/docs/${guid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [role]: saved,
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
  }, [guid, role, form]);

  function updateField(key: keyof ContactRef, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function selectContact(contact: ContactRef) {
    setForm({ ...contact });
    setError(null);
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? catalog.filter(
        (c) =>
          c.inn.toLowerCase().includes(q) ||
          c["full-name"].toLowerCase().includes(q),
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
          {roleTitle(role)}
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--wizard-muted)" }}>
          Оберіть існуючий контакт або заповніть форму. Усі поля обов’язкові;
          РНОКПП — ключ у каталозі.
        </p>
      </div>

      <div>
        <label
          htmlFor={`contact-search-${role}`}
          className="text-sm font-medium"
          style={{ color: "var(--wizard-text)" }}
        >
          Пошук у каталозі
        </label>
        <input
          id={`contact-search-${role}`}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="РНОКПП або ім’я"
          disabled={isPending}
          className="mt-2 w-full rounded-[var(--wizard-radius)] border px-3 py-2 text-sm"
          style={inputStyle}
        />
        {filtered.length > 0 ? (
          <ul
            className="mt-2 max-h-40 overflow-y-auto rounded-[var(--wizard-radius)] border"
            style={{ borderColor: "var(--wizard-border)" }}
            role="listbox"
            aria-label="Каталог контактів"
          >
            {filtered.map((c) => (
              <li key={c.inn}>
                <button
                  type="button"
                  role="option"
                  aria-selected={form.inn === c.inn}
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-[#eef0f3]"
                  style={{ color: "var(--wizard-text)" }}
                  onClick={() => selectContact(c)}
                  disabled={isPending}
                >
                  <span className="font-medium">{c["full-name"]}</span>
                  <span
                    className="font-mono text-xs"
                    style={{ color: "var(--wizard-muted)" }}
                  >
                    {c.inn}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm" style={{ color: "var(--wizard-muted)" }}>
            {catalog.length === 0
              ? "Каталог порожній — створіть новий контакт нижче."
              : "Нічого не знайдено за запитом."}
          </p>
        )}
      </div>

      <fieldset className="flex flex-col gap-3" disabled={isPending}>
        <legend
          className="text-sm font-medium"
          style={{ color: "var(--wizard-text)" }}
        >
          Дані контакту
        </legend>
        {FIELD_LABELS.map(({ key, label }) => (
          <div key={key}>
            <label
              htmlFor={`contact-${role}-${key}`}
              className="text-xs uppercase tracking-wide"
              style={{ color: "var(--wizard-muted)" }}
            >
              {label}
            </label>
            <input
              id={`contact-${role}-${key}`}
              type="text"
              value={form[key]}
              onChange={(e) => updateField(key, e.target.value)}
              required
              className="mt-1 w-full rounded-[var(--wizard-radius)] border px-3 py-2 text-sm"
              style={inputStyle}
            />
          </div>
        ))}
      </fieldset>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
