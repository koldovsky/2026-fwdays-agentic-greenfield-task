import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  EmailnatorError,
  isEmailnatorError,
} from "../server/providers/emailnator/errors.server.ts";
import {
  runDetailAction,
  runGenerateAction,
  runListAction,
} from "../server/providers/emailnator/phase0.server.ts";

const STATE_PATH = resolve(process.cwd(), ".local/phase0/emailnator-session.capsule.enc");

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

function getMessageIdArgument(args: string[]): string {
  const named = args.find((arg) => arg.startsWith("--messageId="));
  if (named) {
    return named.slice("--messageId=".length);
  }

  const positional = args.find((arg) => !arg.startsWith("--"));
  if (!positional) {
    throw new EmailnatorError(
      "VALIDATION_FAILED",
      "detail requires a bounded opaque messageId argument.",
      { status: 400 },
    );
  }

  return positional;
}

async function main(): Promise<void> {
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
      for (const message of result.messages) {
        console.log(
          `${message.messageId} | ${message.time} | ${message.fromPreview} | ${message.subjectPreview}`,
        );
      }
      return;
    }
    case "detail": {
      const result = await runDetailAction(
        readCapsule(),
        getMessageIdArgument(rest),
        getSessionEnv(),
      );
      writeCapsule(result.capsule);
      console.log(`Content-Type: ${result.detail.contentType}`);
      console.log(`Body length: ${result.detail.bodyLength}`);
      console.log(`Known marker found: ${result.detail.markerFound}`);
      console.log("Message text:");
      console.log(result.localText);
      return;
    }
    case "clear": {
      clearCapsule();
      console.log("Local Phase 0 capsule cleared.");
      return;
    }
    default:
      console.log(
        "Usage: npm run probe:emailnator -- <generate|list|detail|clear> [--messageId=<id>]",
      );
      process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  if (isEmailnatorError(error)) {
    console.error(`${error.code}: ${error.message}`);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
