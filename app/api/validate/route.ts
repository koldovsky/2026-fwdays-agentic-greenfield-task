import { validateUser } from "@/lib/github/client";

// Server-side username existence check for pre-navigation validation (FR-LAND-04).
// Runs on the server so the GitHub call carries the descriptive User-Agent that
// browsers forbid setting (FR-DATA-02).
export async function GET(request: Request): Promise<Response> {
  const username = new URL(request.url).searchParams.get("u") ?? "";
  const result = await validateUser(username);
  return Response.json({ result });
}
