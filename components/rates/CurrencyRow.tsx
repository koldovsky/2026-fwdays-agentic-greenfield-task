"use client";

import { CurrencyAvatar } from "@/components/ds";
import type { Rate } from "@/lib/nbu/mapRates";

/**
 * One currency line — code, Ukrainian name, official rate. No trend pill: this
 * slice has no day-over-day data, and a fabricated "flat" delta would be
 * dishonest (design.md Decision 2). `@/components/ds`'s `RateRow` is reused
 * once `trend-hint` supplies a real delta.
 *
 * @trace FR-RATES-02 FR-RATES-04
 */
export function CurrencyRow({
  rate,
  selected,
  onSelect,
}: {
  rate: Rate;
  selected: boolean;
  onSelect: (code: string) => void;
}) {
  const fmtRate = rate.rate.toLocaleString("uk-UA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });

  return (
    <button
      type="button"
      className="currency-row"
      aria-pressed={selected}
      data-selected={selected || undefined}
      onClick={() => onSelect(rate.code)}
    >
      <CurrencyAvatar code={rate.code} size="md" />
      <span className="currency-row__identity">
        <span className="currency-row__code">{rate.code}</span>
        <span className="currency-row__name">{rate.name}</span>
      </span>
      <span className="currency-row__rate">
        {fmtRate}
        <span className="currency-row__unit">₴</span>
      </span>
    </button>
  );
}
