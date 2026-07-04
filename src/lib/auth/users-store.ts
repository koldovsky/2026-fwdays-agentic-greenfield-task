import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { loadSeedAccounts } from "@/lib/auth/secrets";
import type { StoredUser, UserRole } from "@/lib/auth/types";

const DATA_DIR = process.env.COLIBRI_DATA_DIR ?? path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

async function readUsers(): Promise<StoredUser[]> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(USERS_FILE, "utf8");
    return JSON.parse(raw) as StoredUser[];
  } catch {
    return [];
  }
}

async function writeUsers(users: StoredUser[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

export async function ensureUserStore(): Promise<StoredUser[]> {
  let users = await readUsers();
  if (users.length === 0) {
    const seeds = await loadSeedAccounts();
    users = seeds.map((seed) => ({
      id: randomUUID(),
      username: seed.username,
      passwordHash: hashPassword(seed.password),
      role: seed.role,
      createdAt: new Date().toISOString(),
    }));
    await writeUsers(users);
  }
  return users;
}

export async function listUsers(): Promise<Omit<StoredUser, "passwordHash">[]> {
  const users = await ensureUserStore();
  return users.map(({ passwordHash: _h, ...rest }) => rest);
}

export async function findUserByUsername(username: string): Promise<StoredUser | undefined> {
  const users = await ensureUserStore();
  return users.find((u) => u.username.toLowerCase() === username.toLowerCase());
}

export async function authenticateUser(
  username: string,
  password: string,
): Promise<Omit<StoredUser, "passwordHash"> | null> {
  const user = await findUserByUsername(username);
  if (!user || !verifyPassword(password, user.passwordHash)) return null;
  const { passwordHash: _h, ...safe } = user;
  return safe;
}

export async function createUser(input: {
  username: string;
  password: string;
  role: UserRole;
}): Promise<Omit<StoredUser, "passwordHash">> {
  const users = await ensureUserStore();
  const username = input.username.trim();
  if (!username || username.length < 2) {
    throw new Error("Username must be at least 2 characters.");
  }
  if (!input.password || input.password.length < 4) {
    throw new Error("Password must be at least 4 characters.");
  }
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error("Username already exists.");
  }

  const user: StoredUser = {
    id: randomUUID(),
    username,
    passwordHash: hashPassword(input.password),
    role: input.role,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await writeUsers(users);
  const { passwordHash: _h, ...safe } = user;
  return safe;
}
