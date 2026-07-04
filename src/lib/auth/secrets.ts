import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";

import type { UserRole } from "@/lib/auth/types";

export type SeedAccount = {
  username: string;
  password: string;
  role: UserRole;
};

const SECRET_FILE = process.env.COLIBRI_SECRET_FILE ?? path.join(process.cwd(), ".secret");

/** Parse `key=value` lines; ignores blanks and # comments. */
export function parseSecretFile(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    out[key] = value;
  }
  return out;
}

export async function loadSeedAccounts(): Promise<SeedAccount[]> {
  let raw: string;
  try {
    raw = await fs.readFile(SECRET_FILE, "utf8");
  } catch {
    throw new Error("Missing .secret — copy .secret.example to .secret and set credentials.");
  }

  const values = parseSecretFile(raw);
  const pairs: { prefix: string; role: UserRole }[] = [
    { prefix: "admin", role: "admin" },
    { prefix: "user", role: "user" },
  ];

  return pairs.map(({ prefix, role }) => {
    const username = values[`${prefix}.username`]?.trim();
    const password = values[`${prefix}.password`] ?? "";
    if (!username || !password) {
      throw new Error(`.secret must define ${prefix}.username and ${prefix}.password`);
    }
    return { username, password, role };
  });
}

export function loadSeedAccountsSync(): SeedAccount[] {
  let raw: string;
  try {
    raw = readFileSync(SECRET_FILE, "utf8");
  } catch {
    throw new Error("Missing .secret — copy .secret.example to .secret and set credentials.");
  }

  const values = parseSecretFile(raw);
  const pairs: { prefix: string; role: UserRole }[] = [
    { prefix: "admin", role: "admin" },
    { prefix: "user", role: "user" },
  ];

  return pairs.map(({ prefix, role }) => {
    const username = values[`${prefix}.username`]?.trim();
    const password = values[`${prefix}.password`] ?? "";
    if (!username || !password) {
      throw new Error(`.secret must define ${prefix}.username and ${prefix}.password`);
    }
    return { username, password, role };
  });
}
