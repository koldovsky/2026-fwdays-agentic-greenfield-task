import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  EmailnatorError,
  isEmailnatorError,
} from "../server/providers/emailnator/errors.server.ts";
import {
  restoreStateFromCapsule,
  runGenerateAction,
  runListAction,
  runLocalDetailAction,
  type LocalDetailEvidence,
} from "../server/providers/emailnator/phase0.server.ts";
import { phase0MessageIdSchema } from "../server/providers/emailnator/schemas.server.ts";

const STATE_PATH = resolve(process.cwd(), ".local/phase0/emailnator-session.capsule.enc");

type SessionEnv = ReturnType<typeof getSessionEnv>;
type ProbeListMessage = Awaited<ReturnType<typeof runListAction>>["messages"][number];

function ensureStateDirectory(): void {
  mkdirSync(resolve(process.cwd(), ".local/phase0"), { recursive: true });
}

function readCapsule(): string {
  if (!existsSync(STATE_PATH)) {
    throw new EmailnatorError(
      "STATE_INVALID",
      "No local Phase 0 session capsule was found. Run generate first.",
      {
        status: 400,
      },
    );
  }

  return readFileSync(STATE_PATH, "utf8").trim();
}

function writeCapsule(capsule: string): void {
  ensureStateDirectory();
  writeFileSync(STATE_PATH, capsule, "utf8");
}

function clearCapsule(): void {
  if (existsSync(STATE_PATH)) {
    rmSync(STATE_PATH);
  }
}

function getSessionEnv() {
  return {
    PHASE0_SESSION_KEY: process.env.PHASE0_SESSION_KEY,
  };
}

function getNamedArgument(args: string[], prefix: string): string | undefined {
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function validateMessageId(messageId: string): string {
  const parsed = phase0MessageIdSchema.safeParse(messageId);
  if (!parsed.success) {
    throw new EmailnatorError(
      "VALIDATION_FAILED",
      parsed.error.issues[0]?.message ?? "messageId must be a bounded opaque identifier.",
      { status: 400 },
    );
  }

  return parsed.data;
}

function parseIndex(value: string): number {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new EmailnatorError(
      "VALIDATION_FAILED",
      "index must be a positive integer that matches the current list output.",
      { status: 400 },
    );
  }

  return Number(value);
}

export function resolveLocalMessageSelection(
  args: string[],
  capsule: string,
  env: SessionEnv,
): string {
  const index = getNamedArgument(args, "--index=");
  const messageId = getNamedArgument(args, "--messageId=");
  const positional = args.find((arg) => !arg.startsWith("--"));
  const provided = [index, messageId, positional].filter((value) => value != null);

  if (provided.length > 1) {
    throw new EmailnatorError(
      "VALIDATION_FAILED",
      "detail accepts exactly one selector: either --index=<number> or --messageId=<id>.",
      { status: 400 },
    );
  }

  if (index != null) {
    const resolvedIndex = parseIndex(index);
    const state = restoreStateFromCapsule(capsule, env);
    const storedMessageIds = state.lastListedMessageIds ?? [];

    if (storedMessageIds.length === 0) {
      throw new EmailnatorError(
        "STATE_INVALID",
        "No stored message list is available. Run list first, then choose an index.",
        { status: 400 },
      );
    }

    const resolvedMessageId = storedMessageIds[resolvedIndex - 1];
    if (!resolvedMessageId) {
      throw new EmailnatorError(
        "VALIDATION_FAILED",
        `index ${resolvedIndex} is out of range for the current stored list (1-${storedMessageIds.length}).`,
        { status: 400 },
      );
    }

    return resolvedMessageId;
  }

  if (messageId != null) {
    return validateMessageId(messageId);
  }

  if (positional != null) {
    return validateMessageId(positional);
  }

  throw new EmailnatorError(
    "VALIDATION_FAILED",
    "detail requires either --index=<number> or a bounded opaque messageId argument.",
    { status: 400 },
  );
}

export function formatListMessageLines(messages: ProbeListMessage[]): string[] {
  return messages.map(
    (message, index) =>
      `[${index + 1}] ${message.time} | ${message.fromPreview} | ${message.subjectPreview}`,
  );
}

export function formatLocalDetailEvidenceLines(detail: LocalDetailEvidence): string[] {
  return [
    `Content-Type: ${detail.contentType}`,
    `Body length: ${detail.bodyLength}`,
    `Known marker found: ${detail.markerFound}`,
  ];
}

export async function main(): Promise<void> {
  const [subcommand, ...rest] = process.argv.slice(2);

  switch (subcommand) {
    case "generate": {
      const result = await runGenerateAction(getSessionEnv());
      writeCapsule(result.capsule);
      console.log(`Generated inbox: ${result.address}`);
      console.log(`Capsule saved to ${STATE_PATH}`);
      console.log(
        "Send the harmless manual test email, then run `npm run probe:emailnator -- list`.",
      );
      return;
    }
    case "list": {
      const result = await runListAction(readCapsule(), getSessionEnv());
      writeCapsule(result.capsule);
      console.log(`Restored session. ${result.messages.length} message(s) found.`);
      for (const line of formatListMessageLines(result.messages)) {
        console.log(line);
      }
      return;
    }
    case "detail": {
      const capsule = readCapsule();
      const result = await runLocalDetailAction(
        capsule,
        resolveLocalMessageSelection(rest, capsule, getSessionEnv()),
        getSessionEnv(),
      );
      writeCapsule(result.capsule);
      for (const line of formatLocalDetailEvidenceLines(result.detail)) {
        console.log(line);
      }
      return;
    }
    case "clear": {
      clearCapsule();
      console.log("Local Phase 0 capsule cleared.");
      return;
    }
    default:
      console.log(
        "Usage: npm run probe:emailnator -- <generate|list|detail|clear> [--index=<n>|--messageId=<id>]",
      );
      process.exitCode = 1;
  }
}

const isMain =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(resolve(process.argv[1]!)).href;

if (isMain) {
  main().catch((error: unknown) => {
    if (isEmailnatorError(error)) {
      console.error(`${error.code}: ${error.message}`);
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  });
}
