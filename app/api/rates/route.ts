import { fetchTodayRates } from "@/lib/nbu/fetchTodayRates";

/**
 * GET /api/rates — the only client-reachable path to fresh NBU data
 * (TC-DATA-01). Used by the manual retry button after a failed first load;
 * always bypasses the Data Cache so a retry reflects current upstream state.
 */
export async function GET() {
  const result = await fetchTodayRates({ noStore: true });
  return Response.json(result);
}
