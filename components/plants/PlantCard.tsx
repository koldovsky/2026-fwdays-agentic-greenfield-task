// «Поливайко» plant card (design D6, FR-DS-03). Used by the list (`app/page.tsx`).
// Radius-22 cloud card, 1px border, overflow-hidden: a striped placeholder image
// area with a bottom-left monospace filename chip + a top-right status pill, then
// a body with a Quicksand title, Mulish-italic species/latin name, a status line
// (droplet + text), and a full-width action Button. The whole card links to
// `/plants/[id]`, preserving the list→detail navigation.
//
// The `status` drives the pill colors + action variant. It ships as a STATIC
// PLACEHOLDER (default "healthy") here — the real derived status is slice 7
// (FR-REM-*), which only has to supply the value.
//
// @trace FR-DS-03

import Link from "next/link";

import { WaterDropIcon } from "@/components/icons";
import { buttonClasses } from "@/components/ui/Button";
import { uk } from "@/lib/i18n/uk";

export type PlantCardStatus = "healthy" | "soon" | "overdue";

export interface PlantCardProps {
  id: number;
  name: string;
  species: string;
  /** Optional acquired-date meta line shown under the species. */
  meta?: string;
  /** Placeholder watering status (default healthy; real wiring is slice 7). */
  status?: PlantCardStatus;
}

const PILL_CLASSES: Record<PlantCardStatus, string> = {
  healthy: "bg-status-healthy-chip text-status-healthy-text",
  soon: "bg-status-soon-chip text-status-soon-text",
  overdue: "bg-status-overdue-chip text-status-overdue-text",
};

const DOT_CLASSES: Record<PlantCardStatus, string> = {
  healthy: "bg-status-healthy-dot",
  soon: "bg-status-soon-dot",
  overdue: "bg-status-overdue-dot",
};

const PILL_LABEL: Record<PlantCardStatus, string> = {
  healthy: uk.plants.card.statusHealthy,
  soon: uk.plants.card.statusSoon,
  overdue: uk.plants.card.statusOverdue,
};

const ACTION_LABEL: Record<PlantCardStatus, string> = {
  healthy: uk.plants.card.actionHealthy,
  soon: uk.plants.card.actionSoon,
  overdue: uk.plants.card.actionOverdue,
};

const ACTION_VARIANT = {
  healthy: "soft",
  soon: "primary",
  overdue: "danger",
} as const;

export function PlantCard({
  id,
  name,
  species,
  meta,
  status = "healthy",
}: PlantCardProps) {
  const filename = `${name.trim().toLowerCase().replace(/\s+/g, "-") || "plant"}.jpg`;

  return (
    <Link
      href={`/plants/${id}`}
      className="group block overflow-hidden rounded-[22px] border border-border bg-cloud transition-colors hover:border-sage focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
    >
      {/* Image area — striped green placeholder (real photos: Future). */}
      <div
        className="relative h-[150px] w-full"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, var(--color-stripe-green-a), var(--color-stripe-green-a) 12px, var(--color-stripe-green-b) 12px, var(--color-stripe-green-b) 24px)",
        }}
      >
        <span className="absolute bottom-2 left-2 rounded-[7px] bg-cloud/80 px-2 py-1 font-mono text-[11px] text-stone">
          {filename}
        </span>
        <span
          className={`absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-[999px] px-2.5 py-1 font-mono text-[11px] font-medium ${PILL_CLASSES[status]}`}
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${DOT_CLASSES[status]}`}
          />
          {PILL_LABEL[status]}
        </span>
      </div>

      {/* Body */}
      <div className="p-[18px]">
        <h2 className="font-display text-[20px] font-bold tracking-tight text-ink">
          {name}
        </h2>
        <p className="mt-0.5 font-body text-[13px] italic text-placeholder">
          {species}
        </p>
        {meta ? (
          <p className="mt-0.5 font-mono text-[12px] text-stone">{meta}</p>
        ) : null}

        <p
          className={`mt-3 flex items-center gap-1.5 font-body text-[13px] ${
            status === "overdue" ? "font-semibold text-danger" : "text-stone"
          }`}
        >
          <WaterDropIcon size={15} />
          {uk.plants.card.statusLine}
        </p>

        {/* Presentational action styled as a Button. The whole card is the
            link target, so the action is NOT a separate interactive control
            (a nested <button>/<a> would be invalid). Slice 7 wires the real
            water action; here it ships as the placeholder affordance. */}
        <div className="mt-3">
          <span
            aria-hidden="true"
            className={buttonClasses(ACTION_VARIANT[status], "w-full")}
          >
            {ACTION_LABEL[status]}
          </span>
        </div>
      </div>
    </Link>
  );
}
