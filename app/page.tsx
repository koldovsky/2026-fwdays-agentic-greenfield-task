import { RatesView } from "@/components/rates/RatesView";
import { isStaleRate } from "@/lib/nbu/kyivDate";
import { fetchTodayRates } from "@/lib/nbu/fetchTodayRates";
import { SAYINGS } from "@/lib/sayings/sayings";
import { selectSaying } from "@/lib/sayings/selectSaying";

/** @trace FR-RATES-01 FR-RATES-03 FR-SAYINGS-01 */
export default async function Home() {
  const result = await fetchTodayRates();
  const stale = result.ok ? isStaleRate(result.exchangeDate, new Date()) : false;
  // Computed once, server-side: AppFooter is reached through RatesView's
  // ("use client") render tree, so it is not safe to call new Date() inside
  // it directly (see design.md Decision 1).
  const saying = selectSaying(SAYINGS, new Date());

  return <RatesView initial={result} initialStale={stale} saying={saying} />;
}
