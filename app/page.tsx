import { RatesView } from "@/components/rates/RatesView";
import { isStaleRate } from "@/lib/nbu/kyivDate";
import { fetchTodayRates } from "@/lib/nbu/fetchTodayRates";

/** @trace FR-RATES-01 FR-RATES-03 */
export default async function Home() {
  const result = await fetchTodayRates();
  const stale = result.ok ? isStaleRate(result.exchangeDate, new Date()) : false;

  return <RatesView initial={result} initialStale={stale} />;
}
