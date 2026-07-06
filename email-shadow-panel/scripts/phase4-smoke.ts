import { Buffer } from "node:buffer";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";

import {
  publicCreateInboxResponseSchema,
  publicErrorEnvelopeSchema,
  publicHealthResponseSchema,
  publicListMessagesResponseSchema,
  publicMessageDetailResponseSchema,
} from "../server/api/contracts.server.ts";
import { z } from "zod";

export const PHASE4_REQUEST_TIMEOUT_MS = 12_000;
export const PHASE4_RESPONSE_LIMIT_BYTES = 64 * 1024;
export const PHASE4_LIST_ATTEMPTS = 4;
export const PHASE4_LIST_WAIT_MS = [0, 2_000, 5_000, 10_000] as const;
export const PHASE4_MANUAL_CONFIRMATION = "SEND";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

export interface Phase4SmokeReport {
  baseUrl: string;
  healthStatus: "ok" | "degraded";
  messageCount: number;
  detailContentType: string;
  detailBodyLength: number;
  detailMarkerFound: boolean;
  deleteStatus: number;
  postDeleteCode: string;
}

export function normalizeSmokeBaseUrl(rawBaseUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawBaseUrl);
  } catch (error) {
    throw new Error(`Base URL is invalid: ${(error as Error).message}`);
  }

  if (!parsed.protocol || !["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Base URL must use http or https.");
  }

  if (parsed.username || parsed.password) {
    throw new Error("Base URL must not include credentials.");
  }

  if (parsed.search || parsed.hash) {
    throw new Error("Base URL must not include a query string or fragment.");
  }

  if (parsed.pathname !== "/") {
    throw new Error("Base URL must point to the application root.");
  }

  if (parsed.protocol !== "https:" && !LOCAL_HOSTNAMES.has(parsed.hostname)) {
    throw new Error("Base URL must use HTTPS outside localhost.");
  }

  return new URL(parsed.origin + "/");
}

async function readBoundedText(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          await reader.cancel();
          throw new Error(`Response exceeded ${maxBytes} bytes.`);
        }
        chunks.push(value);
      }
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
}

async function requestJson(
  baseUrl: URL,
  pathname: string,
  init?: RequestInit,
): Promise<{ status: number; json: unknown | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new DOMException("Timed out", "AbortError")),
    PHASE4_REQUEST_TIMEOUT_MS,
  );
  const headers = new Headers(init?.headers);

  try {
    const response = await fetch(new URL(pathname, baseUrl), {
      ...init,
      headers,
      signal: controller.signal,
    });

    const text = await readBoundedText(response, PHASE4_RESPONSE_LIMIT_BYTES);
    if (text.length === 0) {
      return { status: response.status, json: null };
    }

    try {
      return { status: response.status, json: JSON.parse(text) as unknown };
    } catch (error) {
      throw new Error(
        `The response from ${pathname} was not valid JSON: ${(error as Error).message}`,
      );
    }
  } finally {
    clearTimeout(timeout);
  }
}

function formatSummary(report: Phase4SmokeReport): string[] {
  return [
    `Health: ${report.healthStatus}`,
    `Messages: ${report.messageCount}`,
    `Detail structure: ${report.detailContentType} / ${report.detailBodyLength} bytes / marker=${report.detailMarkerFound}`,
    `Delete status: ${report.deleteStatus}`,
    `Post-delete code: ${report.postDeleteCode}`,
    "PHASE 4 SMOKE: PASS",
  ];
}

function formatFailure(error: Error): string[] {
  return ["PHASE 4 SMOKE: FAIL", error.message];
}

async function promptForConfirmation(): Promise<void> {
  const prompt = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await prompt.question(
      `Type ${PHASE4_MANUAL_CONFIRMATION} after sending exactly one harmless message: `,
    );
    if (answer.trim() !== PHASE4_MANUAL_CONFIRMATION) {
      throw new Error("Manual confirmation was not received.");
    }
  } finally {
    prompt.close();
  }
}

async function waitForOneMessage(
  baseUrl: URL,
  capabilityToken: string,
): Promise<z.infer<typeof publicListMessagesResponseSchema>["data"]> {
  let lastMessageCount = 0;

  for (let attempt = 0; attempt < PHASE4_LIST_ATTEMPTS; attempt += 1) {
    const waitMs =
      PHASE4_LIST_WAIT_MS[attempt] ?? PHASE4_LIST_WAIT_MS[PHASE4_LIST_WAIT_MS.length - 1];
    if (waitMs > 0) {
      await delay(waitMs);
    }

    const response = await requestJson(baseUrl, "/api/inboxes/messages", {
      method: "GET",
      headers: {
        authorization: `Bearer ${capabilityToken}`,
      },
    });
    const parsed = publicListMessagesResponseSchema.parse(response.json);
    lastMessageCount = parsed.data.messages.length;

    if (lastMessageCount === 1) {
      return parsed.data;
    }

    if (lastMessageCount > 1) {
      throw new Error("The smoke check expects exactly one message in the inbox.");
    }
  }

  throw new Error(`No message was observed after ${PHASE4_LIST_ATTEMPTS} bounded attempts.`);
}

async function runPhase4Smoke(baseUrl: URL): Promise<Phase4SmokeReport> {
  let capabilityToken = "";
  let inboxAddress = "";
  let selectedMessageReference = "";

  try {
    const healthResponse = await requestJson(baseUrl, "/api/health", { method: "GET" });
    const healthBody = publicHealthResponseSchema.parse(healthResponse.json);
    if (healthBody.data.status !== "ok") {
      throw new Error(
        `Health returned ${healthBody.data.status}, so the provider smoke cannot continue.`,
      );
    }

    const createResponse = await requestJson(baseUrl, "/api/inboxes", { method: "POST" });
    const createBody = publicCreateInboxResponseSchema.parse(createResponse.json);
    capabilityToken = createBody.data.capabilityToken;
    inboxAddress = createBody.data.inbox.address;

    console.log(`Inbox address: ${inboxAddress}`);
    console.log(
      "Send exactly one harmless test email to that inbox, then confirm in the terminal.",
    );

    await promptForConfirmation();
    const listed = await waitForOneMessage(baseUrl, capabilityToken);
    const selectedMessage = listed.messages[0];
    if (!selectedMessage) {
      throw new Error("The smoke check did not receive a message summary.");
    }
    selectedMessageReference = selectedMessage.reference;

    const detailResponse = await requestJson(
      baseUrl,

      `/api/inboxes/messages/${encodeURIComponent(selectedMessageReference)}`,
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${capabilityToken}`,
        },
      },
    );
    const detailBody = publicMessageDetailResponseSchema.parse(detailResponse.json);

    if (detailBody.data.message.reference !== selectedMessageReference) {
      throw new Error("The message detail did not resolve the selected application reference.");
    }

    const deleteResponse = await requestJson(baseUrl, "/api/inboxes", {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${capabilityToken}`,
      },
    });
    if (deleteResponse.status !== 204) {
      throw new Error(`Inbox deletion returned HTTP ${deleteResponse.status}.`);
    }

    const postDeleteResponse = await requestJson(baseUrl, "/api/inboxes/messages", {
      method: "GET",
      headers: {
        authorization: `Bearer ${capabilityToken}`,
      },
    });
    const postDeleteBody = publicErrorEnvelopeSchema.parse(postDeleteResponse.json);
    if (!["SESSION_NOT_FOUND", "SESSION_EXPIRED"].includes(postDeleteBody.error.code)) {
      throw new Error(
        `Post-delete access returned ${postDeleteBody.error.code} instead of a safe session error.`,
      );
    }

    return {
      baseUrl: baseUrl.origin,
      healthStatus: healthBody.data.status,
      messageCount: listed.messages.length,
      detailContentType: detailBody.data.message.contentType,
      detailBodyLength: detailBody.data.message.bodyLength,
      detailMarkerFound: detailBody.data.message.markerFound,
      deleteStatus: deleteResponse.status,
      postDeleteCode: postDeleteBody.error.code,
    };
  } finally {
    capabilityToken = "";
    inboxAddress = "";
    selectedMessageReference = "";
  }
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const baseUrlArg = process.argv.slice(2).find((arg) => arg.startsWith("--base-url="));
  const healthOnly = args.has("--health-only");

  if (!baseUrlArg) {
    throw new Error("Usage: npm run smoke:phase4 -- --base-url=<PREVIEW_URL> [--health-only]");
  }

  const baseUrl = normalizeSmokeBaseUrl(baseUrlArg.slice("--base-url=".length));

  if (healthOnly) {
    const response = await requestJson(baseUrl, "/api/health", { method: "GET" });
    const body = publicHealthResponseSchema.parse(response.json);
    console.log(`Health: ${body.data.status}`);
    if (body.data.status !== "ok") {
      throw new Error(`Health-only smoke returned ${body.data.status}.`);
    }
    console.log("PHASE 4 SMOKE: PASS");
    return;
  }

  const report = await runPhase4Smoke(baseUrl);
  for (const line of formatSummary(report)) {
    console.log(line);
  }
}

const isMain = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]!).href;

if (isMain) {
  main().catch((error: unknown) => {
    const normalized = error instanceof Error ? error : new Error(String(error));
    for (const line of formatFailure(normalized)) {
      console.error(line);
    }
    process.exitCode = 1;
  });
}

export const __testables = {
  formatSummary,
  formatFailure,
  promptForConfirmation,
  requestJson,
  runPhase4Smoke,
  waitForOneMessage,
};
