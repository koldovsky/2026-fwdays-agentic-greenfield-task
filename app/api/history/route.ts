import { fetchHistory } from "@/lib/nbu/fetchHistory";

/**
 * GET /api/history?code=USD — the only client-reachable path to NBU history
 * data (TC-DATA-01). History depends on the client-selected active currency,
 * so unlike currency-list's page-load SSR fetch, this is requested after
 * selection.
 */
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  if (!code) return Response.json({ ok: false });
  const result = await fetchHistory(code);
  return Response.json(result);
}
