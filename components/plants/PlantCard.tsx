// «Поливайко» plant card (design D6, FR-DS-03). Used by the list (`app/page.tsx`).
// Radius-22 cloud card, 1px border, overflow-hidden: a striped placeholder image
// area with a bottom-left monospace filename chip + a top-right status pill, then
// a body with a Quicksand title, Mulish-italic species/latin name, a status line
// (droplet + text), and a full-width action Button. The whole card links to
// `/plants/[id]`, preserving the list→detail navigation.
//
// The `status` drives the pill colors + action variant. Slice 7 (FR-REM-*) wires
// the REAL derived status: the home (`app/page.tsx`) passes `status={row.status}`
// from `getHomeReminders`, so the pill matches the summary due count and reminder
// list (FR-REM-07). The "healthy" default remains only for callers that have no
// reminder data (e.g. an empty placeholder); production always supplies the value.
//
// The decorative filename chip is a STABLE, meaningful mono caption derived from
// the plant's species (a slugged species filename) on a higher-contrast translucent
// cloud backing per design (radius-7 chip). It carries no timestamp/slug leak and
// is purely ornamental (aria-hidden), faithful to design.md's filename-chip intent.
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
  /**
   * Derived watering status (FR-REM-07). The home supplies the real value from
   * `getHomeReminders`; defaults to "healthy" only when no reminder data is given.
   */
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

const STATUS_LINE: Record<PlantCardStatus, string> = {
  healthy: uk.plants.card.statusLineHealthy,
  soon: uk.plants.card.statusLineSoon,
  overdue: uk.plants.card.statusLineOverdue,
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
  // Decorative mono filename chip: a stable slug of the SPECIES (not a timestamp),
  // so the caption is meaningful and never leaks a slugified time. Falls back to a
  // fixed label when no species is given.
  const filename = `${species.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "plant"}.jpg`;

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
        <span
          aria-hidden="true"
          className="absolute bottom-2 left-2 rounded-[7px] bg-cloud/90 px-2 py-1 font-mono text-[11px] text-bark"
        >
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
          {STATUS_LINE[status]}
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
