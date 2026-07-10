export type Role = "manager" | "admin";

interface Account {
  username: string;
  password: string;
  role: Role;
}

// Stub credentials for the course demo - NOT a real auth system.
// Never reuse this pattern for anything handling real user data.
const ACCOUNTS: Account[] = [
  { username: "manager", password: "manager123", role: "manager" },
  { username: "admin", password: "admin123", role: "admin" },
];

export function verifyCredentials(username: string, password: string): Role | null {
  const account = ACCOUNTS.find(
    (a) => a.username === username && a.password === password,
  );
  return account?.role ?? null;
}

export const SESSION_COOKIE = "fc_session";
