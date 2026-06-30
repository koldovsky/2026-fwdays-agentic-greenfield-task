"use client";

import { CurrencyAvatar } from "@/components/ds";
import { uk } from "@/lib/i18n/uk";
import type { Rate } from "@/lib/nbu/mapRates";

/**
 * Right-slot summary for the active currency. Empty state is a calm prompt,
 * not a blank panel (NFR-OBS-01). `converter` and `rate-history` extend this
 * panel in later slices.
 *
 * @trace FR-RATES-04
 */
export function CurrencyFocusPanel({ rate }: { rate: Rate | null }) {
  if (!rate) {
    return (
      <div className="shell-placeholder">
        <p className="shell-placeholder__hint">{uk.rates.selectPrompt}</p>
      </div>
    );
  }

  const fmtRate = rate.rate.toLocaleString("uk-UA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });

  return (
    <div className="currency-focus">
      <CurrencyAvatar code={rate.code} size="lg" />
      <div className="currency-focus__identity">
        <span className="currency-focus__code">{rate.code}</span>
        <span className="currency-focus__name">{rate.name}</span>
      </div>
      <div className="currency-focus__rate">
        {fmtRate}
        <span className="currency-focus__unit">₴</span>
      </div>
    </div>
  );
}
