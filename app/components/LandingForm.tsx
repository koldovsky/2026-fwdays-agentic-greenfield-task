"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./Button";
import { strings } from "@/lib/strings";
import type { ValidationResult } from "@/lib/github/client";

type Mode = "stats" | "battle";

const { landing } = strings;

async function validate(username: string): Promise<ValidationResult> {
  const res = await fetch(`/api/validate?u=${encodeURIComponent(username)}`);
  if (!res.ok) return "error";
  const body = (await res.json()) as { result: ValidationResult };
  return body.result;
}

// Field-level error text from a validation outcome. `found` clears the error.
function errorFor(result: ValidationResult): string {
  return result === "not-found" ? landing.errorNotFound : "";
}

export function LandingForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("stats");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [errA, setErrA] = useState("");
  const [errB, setErrB] = useState("");
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setErrA("");
    setErrB("");
    setFormError("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;

    const loginA = a.trim(); // FR-LAND-03: trim before use
    const loginB = b.trim();
    setFormError("");

    // FR-LAND-07: empty required inputs block submission with no API call.
    let hasEmpty = false;
    if (!loginA) {
      setErrA(landing.errorEmpty);
      hasEmpty = true;
    } else {
      setErrA("");
    }
    if (mode === "battle") {
      if (!loginB) {
        setErrB(landing.errorEmpty);
        hasEmpty = true;
      } else {
        setErrB("");
      }
    }
    if (hasEmpty) return;

    setPending(true); // FR-LAND-08: pending + disabled prevents duplicate submits
    try {
      if (mode === "stats") {
        const result = await validate(loginA);
        setErrA(errorFor(result));
        if (result === "found") {
          router.push(`/stats/${encodeURIComponent(loginA)}`);
          return;
        }
        surfaceNonField(result);
      } else {
        // FR-LAND-06: validate both in parallel; flag only the failures.
        const [ra, rb] = await Promise.all([validate(loginA), validate(loginB)]);
        setErrA(errorFor(ra));
        setErrB(errorFor(rb));
        if (ra === "found" && rb === "found") {
          router.push(
            `/battle/${encodeURIComponent(loginA)}/${encodeURIComponent(loginB)}`,
          );
          return;
        }
        surfaceNonField(ra === "found" ? rb : ra);
      }
    } finally {
      setPending(false);
    }
  }

  // Rate-limit / transport errors aren't a "not found" — show them form-level
  // rather than flagging an input red.
  function surfaceNonField(result: ValidationResult) {
    if (result === "rate-limited") setFormError(strings.states.rateLimitTitle);
    else if (result === "error") setFormError(strings.states.genericErrorBody);
  }

  const actionLabel = pending
    ? landing.validating
    : mode === "stats"
      ? landing.exploreAction
      : landing.fightAction;

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col items-center gap-5"
    >
      {/* Mode toggle (FR-LAND-01), centered */}
      <div
        role="tablist"
        aria-label="Mode"
        className="inline-flex gap-1 rounded-md border border-border bg-surface p-1"
      >
        {(
          [
            ["stats", landing.modeStats],
            ["battle", landing.modeBattle],
          ] as const
        ).map(([value, label]) => {
          const on = mode === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => switchMode(value)}
              className={`rounded-[8px] px-5 py-2 font-sans text-[14px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary ${
                on ? "bg-accent-primary text-bg" : "text-text-muted hover:text-text"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Entry row (FR-LAND-02). Explore: input + action inline.
          Compare: two inputs over a full-width action. */}
      {mode === "stats" ? (
        <div className="flex w-full max-w-xl flex-col items-stretch gap-3 sm:flex-row sm:items-start">
          <Field
            label={landing.statsInputLabel}
            value={a}
            onChange={setA}
            error={errA}
            disabled={pending}
            className="flex-1"
          />
          <SubmitButton label={actionLabel} pending={pending} />
        </div>
      ) : (
        <div className="flex w-full max-w-xl flex-col items-stretch gap-3">
          <Field
            label={landing.battleInputLabelA}
            value={a}
            onChange={setA}
            error={errA}
            disabled={pending}
          />
          <Field
            label={landing.battleInputLabelB}
            value={b}
            onChange={setB}
            error={errB}
            disabled={pending}
          />
          <SubmitButton label={actionLabel} pending={pending} className="w-full" />
        </div>
      )}

      {formError && (
        <p role="alert" className="font-sans text-small text-accent-danger">
          {formError}
        </p>
      )}
    </form>
  );
}

function SubmitButton({
  label,
  pending,
  className = "",
}: {
  label: string;
  pending: boolean;
  className?: string;
}) {
  return (
    <Button
      type="submit"
      variant="primary"
      disabled={pending}
      aria-busy={pending}
      className={className}
    >
      {label}
      {!pending && <span aria-hidden className="ml-2">→</span>}
    </Button>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  disabled,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error: string;
  disabled: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <input
        value={value}
        aria-label={label}
        placeholder={strings.landing.inputPlaceholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className="w-full rounded-md border-[1.5px] bg-surface px-[15px] py-3 font-sans text-[15px] text-text outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent-primary disabled:opacity-60"
        style={{ borderColor: error ? "var(--accent-danger)" : "var(--border)" }}
      />
      {error && (
        <span className="mt-1.5 block text-left font-sans text-[12.5px] text-accent-danger">
          {error}
        </span>
      )}
    </div>
  );
}
