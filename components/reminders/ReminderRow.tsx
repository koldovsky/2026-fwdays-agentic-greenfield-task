"use client";

// «Поливайко» reminder row (design D7, FR-REM-04, FR-REM-05) — a client island
// because the done-swap is an optimistic local transition. Renders a striped
// thumb, the plant name, an urgency-COLORED due line (danger for overdue, clay
// for soon — never the wrong color), and a trailing water-now droplet Button with
// an accessible label that calls `waterNowAction(id)` and swaps to a mist+check
// done state showing "Полито щойно ✓". Keyboard-operable and labelled (SC-6,
// NFR-A11Y-04).
//
// @trace FR-REM-04
// @trace FR-REM-05
// @trace SC-6
// @trace NFR-A11Y-04

import { useState, useTransition } from "react";

import { WaterDropIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { uk } from "@/lib/i18n/uk";
import { waterNowAction } from "@/lib/reminders/actions";

export interface ReminderRowProps {
  id: number;
  name: string;
  /** Due plants are soon or overdue; the color/urgency follows the status. */
  status: "soon" | "overdue";
  /** Pre-formatted due line copy (e.g. "Прострочено на 3 дні"). */
  dueLabel: string;
  /** Optional meta line under the name (e.g. species). */
  meta?: string;
}

const DUE_LINE_CLASS: Record<ReminderRowProps["status"], string> = {
  // Overdue uses the danger/overdue color; soon uses the clay/soon color. The
  // class keywords are asserted by the test (an overdue row never shows soon).
  overdue: "font-semibold text-danger",
  soon: "text-clay",
};

export function ReminderRow({ id, name, status, dueLabel, meta }: ReminderRowProps) {
  const [done, setDone] = useState(false);
  // A failed water-now (e.g. the plant was deleted in another tab, or an
  // unexpected DB error) returns a friendly Ukrainian formError. Surface it
  // inline near the button instead of silently swallowing it (FR-REM-05,
  // FR-SHELL-03) — and do NOT swap to the done state on failure.
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleWaterNow() {
    setError(null);
    startTransition(async () => {
      const result = await waterNowAction(id);
      if (result.ok) {
        setDone(true);
      } else {
        setError(result.formError ?? uk.errors.generic);
      }
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-border bg-cloud p-3">
      {/* Striped placeholder thumb (real photos: Future). */}
      <div
        aria-hidden="true"
        className="h-[54px] w-[54px] shrink-0 rounded-[12px]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, var(--color-stripe-green-a), var(--color-stripe-green-a) 8px, var(--color-stripe-green-b) 8px, var(--color-stripe-green-b) 16px)",
        }}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-[16px] font-bold text-ink">
          {name}
        </p>
        {meta ? (
          <p className="truncate font-body text-[12px] text-stone">{meta}</p>
        ) : null}
        {done ? (
          <p className="mt-0.5 flex items-center gap-1.5 font-body text-[13px] font-semibold text-forest">
            {uk.reminders.doneLabel}
          </p>
        ) : (
          <p
            className={`mt-0.5 flex items-center gap-1.5 font-body text-[13px] ${DUE_LINE_CLASS[status]}`}
          >
            {dueLabel}
          </p>
        )}
        {error ? (
          <p
            role="alert"
            className="mt-0.5 font-body text-[13px] font-semibold text-danger"
          >
            {error}
          </p>
        ) : null}
      </div>

      {done ? (
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-mist text-forest">
          <WaterDropIcon size={20} />
        </span>
      ) : (
        <Button
          variant="icon"
          aria-label={uk.reminders.waterNow}
          disabled={isPending}
          onClick={handleWaterNow}
          className="shrink-0"
        >
          <WaterDropIcon size={20} />
        </Button>
      )}
    </div>
  );
}
