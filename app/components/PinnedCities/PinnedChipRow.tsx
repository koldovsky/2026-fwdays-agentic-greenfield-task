"use client";

import { uk } from "@/lib/i18n/uk";
import type { PinnedCity } from "@/lib/forecast/types";

function IconPin({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      aria-hidden="true"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconX({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function PinnedChipRow({
  pins,
  activeName,
  onSelect,
  onUnpin,
}: {
  pins: PinnedCity[];
  activeName?: string;
  onSelect: (city: PinnedCity) => void;
  onUnpin: (city: PinnedCity) => void;
}) {
  if (pins.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2" role="list" aria-label={uk.compare.pinnedListLabel}>
      {pins.map((pin) => {
        const isActive = activeName !== undefined && pin.name === activeName;

        return (
          <div
            key={`${pin.lat},${pin.lon}`}
            role="listitem"
            className={[
              "flex items-center gap-1.5 rounded-pill border px-3 py-1 text-sm shadow-sm transition-transform",
              isActive
                ? "scale-105 border-comfort-fair bg-comfort-fair-bg"
                : "border-brand bg-brand-soft",
            ].join(" ")}
          >
            <button
              type="button"
              onClick={() => onSelect(pin)}
              aria-label={`${uk.regions.forecast}: ${pin.name}`}
              aria-pressed={isActive}
              className={[
                "flex cursor-pointer items-center gap-1.5 focus-visible:outline-none",
                isActive ? "text-comfort-fair-fg" : "text-brand",
              ].join(" ")}
            >
              <IconPin size={11} />
              <span className="font-medium text-text">{pin.name}</span>
            </button>
            {pins.length > 1 && (
              <button
                type="button"
                onClick={() => onUnpin(pin)}
                aria-label={`${uk.compare.unpin} ${pin.name}`}
                className="ml-0.5 rounded-full p-0.5 text-text-muted transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-brand"
              >
                <IconX size={12} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
