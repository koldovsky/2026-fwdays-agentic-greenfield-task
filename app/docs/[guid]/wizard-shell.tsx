"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type {
  ContactRef,
  DocType,
  DocumentSession,
  ServiceLine,
  WizardStep,
} from "@/lib/document-session/types";
import { ContactsStep } from "./contacts-step";
import { DocumentNumberingStep } from "./document-numbering-step";
import { DocumentTypeStep } from "./document-type-step";
import { PdfExportStep } from "./pdf-export-step";
import { ServicesStep } from "./services-step";
import { TemplateFillStep } from "./template-fill-step";

const STEPS: WizardStep[] = [1, 2, 3, 4, 5, 6, 7];

type ProgressState = "past" | "current" | "future";

function progressState(step: WizardStep, current: WizardStep): ProgressState {
  if (step < current) return "past";
  if (step === current) return "current";
  return "future";
}

function stepTitle(step: WizardStep, completed: boolean): string {
  if (completed) return "Фінальний перегляд";
  if (step === 1) return "Крок 1 — Тип документа";
  if (step === 2) return "Крок 2 — Дата та номери";
  if (step === 3) return "Крок 3 — Замовник";
  if (step === 4) return "Крок 4 — Виконавець";
  if (step === 5) return "Крок 5 — Послуги";
  if (step === 6) return "Крок 6 — Перегляд";
  return "Крок 7 — Фінальний перегляд";
}

type Props = {
  guid: string;
  initialStep: WizardStep;
  completed: boolean;
  initialDocType: DocType;
  initialCopiedFrom?: string;
  initialDate: string;
  initialInvoiceNumber?: string;
  initialActNumber?: string;
  initialClient?: ContactRef;
  initialDoneBy?: ContactRef;
  initialServices?: ServiceLine[];
};

export function WizardShell({
  guid,
  initialStep,
  completed: initialCompleted,
  initialDocType,
  initialCopiedFrom,
  initialDate,
  initialInvoiceNumber,
  initialActNumber,
  initialClient,
  initialDoneBy,
  initialServices = [],
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(initialStep);
  const [completed, setCompleted] = useState(initialCompleted);
  const [docType, setDocType] = useState<DocType>(initialDocType);
  const [client, setClient] = useState<ContactRef | undefined>(initialClient);
  const [doneBy, setDoneBy] = useState<ContactRef | undefined>(initialDoneBy);
  const [services, setServices] = useState<ServiceLine[]>(initialServices);
  const [error, setError] = useState<string | null>(null);
  const [pendingCopyGuid, setPendingCopyGuid] = useState(false);
  const [dateValid, setDateValid] = useState(true);
  const [isPending, startTransition] = useTransition();
  const issueNumbersRef = useRef<
    (() => Promise<DocumentSession | null>) | null
  >(null);
  const saveContactRef = useRef<
    ((nextStep: WizardStep) => Promise<DocumentSession | null>) | null
  >(null);
  const saveServicesRef = useRef<
    ((nextStep: WizardStep) => Promise<DocumentSession | null>) | null
  >(null);

  const displayStep: WizardStep = completed ? 7 : step;
  const canGoBack = !completed && step > 1;
  const canGoNext = !completed && step < 7;
  const wideLayout = displayStep === 6 || displayStep === 7;

  function applySession(session: DocumentSession) {
    setStep(session["current-step"]);
    setCompleted(session.completed);
    setDocType(session["doc-type"]);
    setClient(session.client);
    setDoneBy(session["done-by"]);
    setServices(session.services);
  }

  function navigate(next: WizardStep) {
    if (completed || isPending || next === step) return;
    if (step === 1 && next > step && pendingCopyGuid) {
      setError(
        "Застосуйте копіювання або очистіть поле guid перед переходом далі",
      );
      return;
    }
    if (step === 2 && next > step && !dateValid) {
      setError("Вкажіть коректну дату документа");
      return;
    }
    setError(null);
    startTransition(async () => {
      if (step === 2 && next > step) {
        const issue = issueNumbersRef.current;
        if (!issue) {
          setError("Не вдалося видати номери");
          return;
        }
        const issued = await issue();
        if (!issued) {
          return;
        }
      }

      if ((step === 3 || step === 4) && next > step) {
        const save = saveContactRef.current;
        if (!save) {
          setError("Не вдалося зберегти контакт");
          return;
        }
        const saved = await save(next);
        if (!saved) {
          return;
        }
        applySession(saved);
        router.refresh();
        return;
      }

      if (step === 5 && next > step) {
        const save = saveServicesRef.current;
        if (!save) {
          setError("Не вдалося зберегти послуги");
          return;
        }
        const saved = await save(next);
        if (!saved) {
          return;
        }
        applySession(saved);
        router.refresh();
        return;
      }

      const patch: Record<string, unknown> = { "current-step": next };
      if (step === 6 && next === 7) {
        patch.completed = true;
      }
      if (step === 7 && next < 7) {
        patch.completed = false;
      }

      const res = await fetch(`/api/docs/${guid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? `Не вдалося зберегти крок (${res.status})`);
        return;
      }
      const session = (await res.json()) as DocumentSession;
      applySession(session);
      router.refresh();
    });
  }

  function reopenForEdit() {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/docs/${guid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: false, "current-step": 6 }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(
          data?.error ?? `Не вдалося відкрити для редагування (${res.status})`,
        );
        return;
      }
      const session = (await res.json()) as DocumentSession;
      applySession(session);
      router.refresh();
    });
  }

  function handleSessionUpdated(session: DocumentSession) {
    setDocType(session["doc-type"]);
    setClient(session.client);
    setDoneBy(session["done-by"]);
    setServices(session.services);
    router.refresh();
  }

  return (
    <div className="wizard-shell flex min-h-full flex-1 flex-col">
      <main
        className={`mx-auto flex w-full flex-1 flex-col px-6 py-10 ${
          wideLayout ? "max-w-6xl" : "max-w-2xl"
        }`}
      >
        <header className="mb-8">
          <p
            className="text-sm font-medium uppercase tracking-wide"
            style={{ color: "var(--wizard-muted)" }}
          >
            Документ
          </p>
          <h1
            className="mt-1 text-2xl font-semibold tracking-tight"
            style={{ color: "var(--wizard-text)" }}
          >
            {stepTitle(displayStep, completed)}
          </h1>
          <p
            className="mt-1 font-mono text-xs"
            style={{ color: "var(--wizard-muted)" }}
          >
            {guid}
          </p>
        </header>

        <nav
          aria-label="Прогрес кроків"
          className="mb-8 flex flex-wrap items-center justify-between gap-2"
        >
          {STEPS.map((n) => {
            const state = progressState(n, displayStep);
            return (
              <div
                key={n}
                className="wizard-progress-circle"
                data-state={state}
                aria-current={state === "current" ? "step" : undefined}
                aria-label={`Крок ${n}${state === "current" ? " (поточний)" : state === "past" ? " (пройдений)" : " (наступний)"}`}
              >
                {n}
              </div>
            );
          })}
        </nav>

        <section
          className="flex-1 rounded-[var(--wizard-radius)] border p-6"
          style={{
            background: "var(--wizard-surface)",
            borderColor: "var(--wizard-border)",
          }}
          aria-live="polite"
        >
          {displayStep === 7 ? (
            <PdfExportStep
              guid={guid}
              docType={docType}
              isPending={isPending}
              onReopenEdit={reopenForEdit}
            />
          ) : displayStep === 1 ? (
            <DocumentTypeStep
              guid={guid}
              initialDocType={initialDocType}
              initialCopiedFrom={initialCopiedFrom}
              onSessionUpdated={handleSessionUpdated}
              onCopyFieldChange={setPendingCopyGuid}
            />
          ) : displayStep === 2 ? (
            <DocumentNumberingStep
              guid={guid}
              docType={docType}
              initialDate={initialDate}
              initialInvoiceNumber={initialInvoiceNumber}
              initialActNumber={initialActNumber}
              onSessionUpdated={handleSessionUpdated}
              onDateValidityChange={setDateValid}
              onIssueRequest={(issue) => {
                issueNumbersRef.current = issue;
              }}
            />
          ) : displayStep === 3 ? (
            <ContactsStep
              key="client"
              guid={guid}
              role="client"
              initialContact={client}
              onSessionUpdated={handleSessionUpdated}
              onSaveRequest={(save) => {
                saveContactRef.current = save;
              }}
            />
          ) : displayStep === 4 ? (
            <ContactsStep
              key="done-by"
              guid={guid}
              role="done-by"
              initialContact={doneBy}
              onSessionUpdated={handleSessionUpdated}
              onSaveRequest={(save) => {
                saveContactRef.current = save;
              }}
            />
          ) : displayStep === 5 ? (
            <ServicesStep
              guid={guid}
              initialServices={services}
              onSessionUpdated={handleSessionUpdated}
              onSaveRequest={(save) => {
                saveServicesRef.current = save;
              }}
            />
          ) : (
            <TemplateFillStep guid={guid} docType={docType} />
          )}
        </section>

        {error ? (
          <p className="mt-4 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        {!completed ? (
          <div className="mt-8 flex items-center justify-between gap-4">
            {canGoBack ? (
              <button
                type="button"
                className="wizard-btn wizard-btn-secondary"
                disabled={isPending}
                onClick={() => navigate((step - 1) as WizardStep)}
              >
                Назад
              </button>
            ) : (
              <span />
            )}
            {canGoNext ? (
              <button
                type="button"
                className="wizard-btn wizard-btn-primary"
                disabled={isPending}
                onClick={() => navigate((step + 1) as WizardStep)}
              >
                Далі
              </button>
            ) : (
              <span />
            )}
          </div>
        ) : null}

        <a
          href={`/api/docs/${guid}/export`}
          className="wizard-btn wizard-btn-secondary mt-8 w-fit"
        >
          Download JSON
        </a>
      </main>
    </div>
  );
}
