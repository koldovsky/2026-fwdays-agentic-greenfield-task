import { handleEmailnatorProbeRequest } from "../../server/providers/emailnator/probe.server.ts";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleEmailnatorProbeRequest(request);
}
