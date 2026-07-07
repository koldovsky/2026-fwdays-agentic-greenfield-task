"use client";

// apps/dashboard/components/ds — DecisionBar (dashboard tasks.md §6.6,
// design.md Decision 4; booking-hitl S4 review-gate CRITICAL fix, `@trace
// FR-HITL-01`, `@trace FR-HITL-03`). Renders all three admin decision
// actions; Confirm/Decline still POST to `/api/decisions/:requestId`
// immediately and render the response INLINE (never a thrown error, never a
// silently-dead button). "Propose another time" no longer POSTs
// immediately — it used to fire `{action:"propose_another_time",
// slots:[]}`, which the real route can never apply — it now REVEALS an
// inline slot-picker (`candidateSlots`, derived upstream via
// `../../lib/candidate-proposal-slots.ts`) so the admin picks >=1 concrete
// slot before "Запропонувати" POSTs the real selection.

import { useState } from "react";
import type { Slot } from "@kamerton/lib/src/slots/grid.ts";
import { Button } from "./Button.tsx";
import { SlotChip } from "./SlotChip.tsx";

export interface DecisionBarProps {
  requestId: number;
  /**
   * On-grid candidate slots for the inline "Propose another time" picker
   * (booking-hitl S4). Derived upstream via
   * `../../lib/candidate-proposal-slots.ts`'s `candidateProposalSlots()`.
   * Optional (defaults to no candidates) so existing call sites/tests that
   * don't pass it still compile and render.
   */
  candidateSlots?: Slot[];
}

type DecisionAction = "confirm" | "propose_another_time" | "decline";

const FALLBACK_MESSAGE = "Не вдалося передати рішення. Спробуйте ще раз.";
const PROPOSAL_APPLIED_MESSAGE = "Новий час запропоновано ліду. Очікуємо на відповідь.";
const SLOT_UNAVAILABLE_FALLBACK =
  "Обраний час уже зайнятий або утримується іншим лідом. Оберіть інший варіант.";

/** Ukrainian short weekday labels, same mapping `HallMap.tsx` uses. */
const WEEKDAY_LABELS: Record<number, string> = { 1: "Пн", 2: "Вт", 3: "Ср", 4: "Чт", 5: "Пт" };

/** Weekday of a "YYYY-MM-DD" calendar date, 0 = Sunday .. 6 = Saturday — same
 *  UTC-midnight-anchored calendar-date arithmetic `lib/`'s own grid helpers
 *  use (a calendar date's weekday does not depend on a timezone). */
function weekdayOf(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

/** A stable identity key for a `Slot` (start+end are always fixed-width
 *  strings, `lib/src/slots/grid.ts`'s own Decision 3). */
function slotKey(slot: Slot): string {
  return `${slot.start}|${slot.end}`;
}

/** `Slot` -> the `SlotChip` display pair (weekday label + "HH:mm–HH:mm"). */
function formatSlotOption(slot: Slot): { weekdayLabel: string; time: string } {
  const dateStr = slot.start.slice(0, 10);
  const weekdayLabel = WEEKDAY_LABELS[weekdayOf(dateStr)] ?? dateStr;
  const time = `${slot.start.slice(11, 16)}–${slot.end.slice(11, 16)}`;
  return { weekdayLabel, time };
}

/** "YYYY-MM-DD" -> "DD.MM" for the inline Ukrainian error copy. */
function formatSlotForMessage(slot: Slot): string {
  const [, month, day] = slot.start.slice(0, 10).split("-");
  const time = slot.start.slice(11, 16);
  return `${day}.${month} о ${time}`;
}

function extractMessage(body: unknown): string {
  if (body !== null && typeof body === "object" && typeof (body as { message?: unknown }).message === "string") {
    return (body as { message: string }).message;
  }
  return FALLBACK_MESSAGE;
}

interface ProposeResponse {
  status?: string;
  code?: string;
  message?: string;
  slot?: Slot;
}

export function DecisionBar({ requestId, candidateSlots = [] }: DecisionBarProps) {
  const [pending, setPending] = useState<DecisionAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<Slot[]>([]);
  const [pickerError, setPickerError] = useState<string | null>(null);

  async function postDecision(body: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(`/api/decisions/${requestId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return response.json().catch(() => null);
  }

  async function handleImmediateClick(action: "confirm" | "decline") {
    setPending(action);
    setMessage(null);
    try {
      const body = await postDecision({ action });
      setMessage(extractMessage(body));
    } catch {
      // External call failed silently would violate NFR-REL-01's spirit —
      // surface a deterministic Ukrainian message instead of a thrown error.
      setMessage(FALLBACK_MESSAGE);
    } finally {
      setPending(null);
    }
  }

  function openPicker() {
    setPickerError(null);
    setPickerOpen(true);
  }

  function closePicker() {
    setPickerOpen(false);
    setSelectedSlots([]);
    setPickerError(null);
  }

  function toggleSlot(slot: Slot, isSelected: boolean) {
    setSelectedSlots((current) => {
      const withoutSlot = current.filter((candidate) => slotKey(candidate) !== slotKey(slot));
      return isSelected ? [...withoutSlot, slot] : withoutSlot;
    });
  }

  async function handleSendProposal() {
    if (selectedSlots.length === 0) return;
    setPending("propose_another_time");
    setPickerError(null);
    try {
      const body = await postDecision({ action: "propose_another_time", slots: selectedSlots });
      const result = (body ?? null) as ProposeResponse | null;
      if (result?.status === "applied") {
        setMessage(result.message ?? PROPOSAL_APPLIED_MESSAGE);
        closePicker();
      } else if (result?.status === "invalid" && result.code === "SLOT_UNAVAILABLE") {
        setPickerError(
          result.message ?? (result.slot !== undefined ? `Час ${formatSlotForMessage(result.slot)} уже зайнятий або утримується іншим лідом. Оберіть інший варіант.` : SLOT_UNAVAILABLE_FALLBACK),
        );
      } else {
        setPickerError(extractMessage(body));
      }
    } catch {
      setPickerError(FALLBACK_MESSAGE);
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
          onClick={() => void handleImmediateClick("confirm")}
        >
          Підтвердити
        </Button>
        {!pickerOpen ? (
          <Button variant="secondary" iconLeft="calendar" disabled={pending !== null} onClick={openPicker}>
            Запропонувати інший час
          </Button>
        ) : null}
        <Button
          variant="danger"
          iconLeft="declined"
          disabled={pending !== null}
          onClick={() => void handleImmediateClick("decline")}
        >
          Відхилити
        </Button>
      </div>

      {pickerOpen ? (
        <div
          data-testid="slot-picker"
          className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-border bg-surface-raised p-4"
        >
          <p className="text-sm text-text-secondary">
            Оберіть один або кілька варіантів часу, які запропонувати замість поточного:
          </p>

          {candidateSlots.length === 0 ? (
            <p className="text-sm text-text-muted">Вільних варіантів на цьому тижні наразі немає.</p>
          ) : (
            <div role="group" aria-label="Варіанти часу" className="flex flex-wrap gap-2">
              {candidateSlots.map((slot) => {
                const option = formatSlotOption(slot);
                const isSelected = selectedSlots.some((selected) => slotKey(selected) === slotKey(slot));
                return (
                  <SlotChip
                    key={slotKey(slot)}
                    weekdayLabel={option.weekdayLabel}
                    time={option.time}
                    selected={isSelected}
                    onSelectedChange={(checked) => toggleSlot(slot, checked)}
                  />
                );
              })}
            </div>
          )}

          {pickerError !== null ? (
            <p role="alert" className="text-sm text-[color:var(--status-declined-fg)]">
              {pickerError}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              disabled={selectedSlots.length === 0 || pending !== null}
              onClick={() => void handleSendProposal()}
            >
              Запропонувати
            </Button>
            <Button variant="ghost" disabled={pending !== null} onClick={closePicker}>
              Скасувати
            </Button>
          </div>
        </div>
      ) : null}

      {message !== null ? (
        <p role="status" aria-live="polite" className="text-sm text-text-secondary">
          {message}
        </p>
      ) : null}
    </div>
  );
}
