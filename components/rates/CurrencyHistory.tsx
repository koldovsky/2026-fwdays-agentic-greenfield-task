"use client";

import { useEffect, useState } from "react";
import { uk } from "@/lib/i18n/uk";
import type { HistoryPoint } from "@/lib/nbu/mapHistory";
import { HistoryChart } from "./HistoryChart";
import { TrendHint } from "./TrendHint";

type HistoryState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "empty" }
  | { status: "ready"; points: HistoryPoint[] };

/**
 * Fetches and renders the active currency's ~30-day rate history. Parents
 * key this component by `rate.code` (same pattern as `Converter`) so a
 * currency switch fully remounts it — the fetch effect therefore always runs
 * exactly once per mount, with no possibility of `code` changing mid-flight,
 * so no cancellation/race guard is needed (design.md Decision 4).
 *
 * @trace FR-HISTORY-01 FR-HISTORY-02 FR-HISTORY-03 FR-HISTORY-04
 * @trace FR-TREND-01 FR-TREND-02 FR-TREND-03
 */
export function CurrencyHistory({ code }: { code: string }) {
  const [state, setState] = useState<HistoryState>({ status: "loading" });

  useEffect(() => {
    fetch(`/api/history?code=${encodeURIComponent(code)}`)
      .then((res) => res.json())
      .then((data: { ok: boolean; points?: HistoryPoint[] }) => {
        if (!data.ok) {
          setState({ status: "error" });
          return;
        }
        if (!data.points || data.points.length === 0) {
          setState({ status: "empty" });
          return;
        }
        setState({ status: "ready", points: data.points });
      })
      .catch(() => setState({ status: "error" }));
  }, [code]);

  return (
    <div className="currency-history">
      <p className="currency-history__title">{uk.history.title}</p>
      {state.status === "loading" && (
        <div className="shell-skeleton" aria-hidden="true">
          <div className="shell-skeleton__block currency-history__skeleton" />
        </div>
      )}
      {state.status === "error" && (
        <p className="shell-slot-empty" role="status">
          {uk.history.loadError}
        </p>
      )}
      {state.status === "empty" && (
        <p className="shell-slot-empty" role="status">
          {uk.history.empty}
        </p>
      )}
      {state.status === "ready" && (
        <>
          <TrendHint code={code} points={state.points} />
          <HistoryChart data={state.points} />
        </>
      )}
    </div>
  );
}
