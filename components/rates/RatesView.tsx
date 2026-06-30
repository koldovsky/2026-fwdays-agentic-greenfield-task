"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell/AppShell";
import { AsOfBadge, Button } from "@/components/ds";
import { uk } from "@/lib/i18n/uk";
import { isStaleRate } from "@/lib/nbu/kyivDate";
import type { FetchRatesResult } from "@/lib/nbu/fetchTodayRates";
import { CurrencyFocusPanel } from "./CurrencyFocusPanel";
import { CurrencyRow } from "./CurrencyRow";

/**
 * Client orchestrator for the currency-list slice: owns selection + the
 * fetch-failure retry. First load is server-rendered (no client loading
 * flash); retry re-enters the shell's loading skeleton while it re-fetches
 * via the Route Handler (never calling NBU from the browser — TC-DATA-01).
 *
 * @trace FR-RATES-01 FR-RATES-02 FR-RATES-03 FR-RATES-04 FR-RATES-05
 */
export function RatesView({
  initial,
  initialStale,
}: {
  initial: FetchRatesResult;
  initialStale: boolean;
}) {
  const [result, setResult] = useState(initial);
  const [stale, setStale] = useState(initialStale);
  const [loading, setLoading] = useState(false);
  const [activeCode, setActiveCode] = useState<string | null>(null);

  async function retry() {
    setLoading(true);
    try {
      const res = await fetch("/api/rates");
      const next = (await res.json()) as FetchRatesResult;
      setResult(next);
      setStale(next.ok ? isStaleRate(next.exchangeDate, new Date()) : false);
    } catch {
      setResult({ ok: false });
    } finally {
      setLoading(false);
    }
  }

  if (!result.ok) {
    return (
      <AppShell
        loading={loading}
        left={
          <div className="rates-error" role="status">
            <p className="rates-error__message">{uk.rates.loadError}</p>
            <Button variant="outline" onClick={retry}>
              {uk.rates.retry}
            </Button>
          </div>
        }
        right={<CurrencyFocusPanel rate={null} />}
      />
    );
  }

  const activeRate = result.rates.find((r) => r.code === activeCode) ?? null;

  return (
    <AppShell
      loading={loading}
      left={
        <div className="currency-list">
          <AsOfBadge
            date={result.exchangeDate}
            stale={stale}
            style={{ marginBottom: "var(--space-3)" }}
          />
          <div className="currency-list__rows">
            {result.rates.map((rate) => (
              <CurrencyRow
                key={rate.code}
                rate={rate}
                selected={rate.code === activeCode}
                onSelect={setActiveCode}
              />
            ))}
          </div>
        </div>
      }
      right={<CurrencyFocusPanel rate={activeRate} />}
    />
  );
}
