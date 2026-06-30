"use client";

import { Converter, CurrencyAvatar } from "@/components/ds";
import { uk } from "@/lib/i18n/uk";
import type { Rate } from "@/lib/nbu/mapRates";
import { CurrencyHistory } from "./CurrencyHistory";

/**
 * Right-slot summary for the active currency. Empty state is a calm prompt,
 * not a blank panel (NFR-OBS-01). Embeds the converter and the rate-history
 * chart when a rate is active.
 *
 * @trace FR-RATES-04 FR-CONVERT-01 FR-CONVERT-02 FR-CONVERT-03 FR-CONVERT-04 FR-CONVERT-05
 * @trace FR-HISTORY-01 FR-HISTORY-02 FR-HISTORY-03 FR-HISTORY-04
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
      <Converter
        key={rate.code}
        code={rate.code}
        rate={rate.rate}
        labels={uk.converter}
        style={{ width: "100%", marginTop: 8 }}
      />
      <CurrencyHistory key={rate.code} code={rate.code} />
    </div>
  );
}
