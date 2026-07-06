import { openSessionCapsule, sealSessionCapsule } from "./capsule.server.ts";
import { EmailnatorError } from "./errors.server.ts";
import {
  generateInboxAddress,
  getMessageDetail,
  listInboxMessages,
  summarizeMessagesForProbe,
  type EmailnatorRuntime,
} from "./provider.server.ts";
import { PHASE0_CAPSULE_TTL_MS, type EmailnatorProviderState } from "./schemas.server.ts";

export interface Phase0Environment {
  PHASE0_SESSION_KEY?: string;
}

export interface Phase0ResultBase {
  capsule: string;
  capsuleExpiresAt: string;
  diagnostics: Awaited<ReturnType<typeof generateInboxAddress>>["diagnostics"];
}

function requireSessionKey(env: Phase0Environment): string {
  if (!env.PHASE0_SESSION_KEY) {
    throw new EmailnatorError("CONFIG_INVALID", "PHASE0_SESSION_KEY is not configured.", {
      status: 500,
    });
  }

  return env.PHASE0_SESSION_KEY;
}

function sealState(
  state: EmailnatorProviderState,
  env: Phase0Environment,
  runtime?: EmailnatorRuntime,
): { capsule: string; capsuleExpiresAt: string } {
  const now = runtime?.now?.() ?? new Date();
  const capsule = sealSessionCapsule(state, requireSessionKey(env), {
    now,
    ttlMs: PHASE0_CAPSULE_TTL_MS,
  });

  return {
    capsule,
    capsuleExpiresAt: new Date(now.getTime() + PHASE0_CAPSULE_TTL_MS).toISOString(),
  };
}

export function restoreStateFromCapsule(
  capsule: string,
  env: Phase0Environment,
  runtime?: EmailnatorRuntime,
): EmailnatorProviderState {
  return openSessionCapsule(capsule, requireSessionKey(env), {
    now: runtime?.now?.() ?? new Date(),
  });
}

export async function runGenerateAction(env: Phase0Environment, runtime?: EmailnatorRuntime) {
  const generated = await generateInboxAddress(runtime);
  return {
    action: "generate" as const,
    address: generated.address,
    diagnostics: generated.diagnostics,
    ...sealState(generated.state, env, runtime),
  };
}

export async function runListAction(
  capsule: string,
  env: Phase0Environment,
  runtime?: EmailnatorRuntime,
) {
  const state = restoreStateFromCapsule(capsule, env, runtime);
  const listed = await listInboxMessages(state, runtime);

  return {
    action: "list" as const,
    messages: summarizeMessagesForProbe(listed.messages),
    diagnostics: listed.diagnostics,
    ...sealState(listed.state, env, runtime),
  };
}

export async function runDetailAction(
  capsule: string,
  messageId: string,
  env: Phase0Environment,
  runtime?: EmailnatorRuntime,
) {
  const state = restoreStateFromCapsule(capsule, env, runtime);
  const detailed = await getMessageDetail(state, messageId, runtime);

  return {
    action: "detail" as const,
    detail: {
      contentType: detailed.detail.contentType,
      bodyLength: detailed.detail.bodyLength,
      textPreview: detailed.detail.textPreview,
      markerFound: detailed.detail.markerFound,
    },
    localText: detailed.detail.text,
    diagnostics: detailed.diagnostics,
    ...sealState(detailed.state, env, runtime),
  };
}
