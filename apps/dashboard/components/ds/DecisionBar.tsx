"use client";

// apps/dashboard/components/ds — DecisionBar (dashboard tasks.md §6.6,
// design.md Decision 4). Renders all three admin decision actions with
// real labels/focus states/`--status-pending`-adjacent styling; `onClick`
// posts to the stubbed `/api/decisions/:requestId` route (tasks.md §5.7)
// and renders that stub's "не підключено" response INLINE — never a thrown
// error, never a silently-dead button. `booking-hitl` (S4) wires the real
// transition behind this exact same component; nothing here changes then.

import { useState } from "react";
import type { Slot } from "@kamerton/lib/src/slots/grid.ts";
import { Button } from "./Button.tsx";

export interface DecisionBarProps {
  requestId: number;
  /**
   * On-grid candidate slots for the future inline "Propose another time"
   * picker (booking-hitl S4, review-gate CRITICAL fix — `@trace
   * FR-HITL-01`, `@trace FR-HITL-03`: this action used to POST `slots:[]`
   * with no selection UI at all, so it could never succeed against the
   * real `/api/decisions/[requestId]` contract). Optional and
   * DELIBERATELY UNUSED in this red round — the button below still POSTs
   * immediately, exactly as before; `DecisionBar.slot-picker.test.tsx`'s
   * red suite pins the contract the green implementation must satisfy.
   * Derived upstream via `../../lib/candidate-proposal-slots.ts`'s
   * `candidateProposalSlots()`.
   */
  candidateSlots?: Slot[];
}

type DecisionAction = "confirm" | "propose_another_time" | "decline";

const FALLBACK_MESSAGE = "Не вдалося передати рішення. Спробуйте ще раз.";

export function DecisionBar({ requestId }: DecisionBarProps) {
  const [pending, setPending] = useState<DecisionAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick(action: DecisionAction) {
    setPending(action);
    setMessage(null);
    try {
      const response = await fetch(`/api/decisions/${requestId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body: unknown = await response.json().catch(() => null);
      const responseMessage =
        body !== null && typeof body === "object" && typeof (body as { message?: unknown }).message === "string"
          ? (body as { message: string }).message
          : FALLBACK_MESSAGE;
      setMessage(responseMessage);
    } catch {
      // External call failed silently would violate NFR-REL-01's spirit —
      // surface a deterministic Ukrainian message instead of a thrown error.
      setMessage(FALLBACK_MESSAGE);
    } finally {
      setPending(null);
    }
  }

  return (
    <div data-testid="decision-bar" className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          iconLeft="confirmed"
          disabled={pending !== null}
          onClick={() => void handleClick("confirm")}
        >
          Підтвердити
        </Button>
        <Button
          variant="secondary"
          iconLeft="calendar"
          disabled={pending !== null}
          onClick={() => void handleClick("propose_another_time")}
        >
          Запропонувати інший час
        </Button>
        <Button
          variant="danger"
          iconLeft="declined"
          disabled={pending !== null}
          onClick={() => void handleClick("decline")}
        >
          Відхилити
        </Button>
      </div>
      {message !== null ? (
        <p role="status" aria-live="polite" className="text-sm text-text-secondary">
          {message}
        </p>
      ) : null}
    </div>
  );
}
