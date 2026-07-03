// Email/password auth service (FR-AUTH-01). Pure orchestration over injected
// user + credential stores (structural ports — the db repos satisfy them, and a
// fake satisfies them in tests). Never returns or logs a password hash.
//
// Sign-in errors are uniform (`invalid_credentials`) whether the email is unknown
// or the password is wrong, and the unknown-email path still runs a scrypt verify
// so response timing can't reveal which accounts exist (task 2.1 / 4.2).
import { hashPassword, verifyPassword } from "./password";

export interface PublicUser {
  readonly id: string;
  readonly email: string | null;
  readonly name: string | null;
}

export type Result<T, E> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

export interface UserStore {
  findByEmail(email: string): Promise<PublicUser | null>;
  create(input: {
    email: string | null;
    name: string | null;
    authProvider: "password";
  }): Promise<PublicUser>;
}

export interface CredentialStore {
  set(userId: string, passwordHash: string): Promise<void>;
  getByEmail(email: string): Promise<{ userId: string; passwordHash: string } | null>;
}

export interface AuthDeps {
  readonly users: UserStore;
  readonly credentials: CredentialStore;
}

// Cached constant-work envelope for the unknown-email timing path.
let timingDummy: string | undefined;
async function dummyHash(): Promise<string> {
  timingDummy ??= await hashPassword("timing-equalizer-not-a-real-password");
  return timingDummy;
}

export async function registerWithPassword(
  deps: AuthDeps,
  input: { email: string; password: string; name?: string | null },
): Promise<Result<PublicUser, "email_taken">> {
  const existing = await deps.users.findByEmail(input.email);
  if (existing !== null) return { ok: false, error: "email_taken" };

  const passwordHash = await hashPassword(input.password);
  const user = await deps.users.create({
    email: input.email,
    name: input.name ?? null,
    authProvider: "password",
  });
  await deps.credentials.set(user.id, passwordHash);
  return { ok: true, value: user };
}

export async function authenticateWithPassword(
  deps: AuthDeps,
  input: { email: string; password: string },
): Promise<Result<PublicUser, "invalid_credentials">> {
  const cred = await deps.credentials.getByEmail(input.email);
  if (cred === null) {
    await verifyPassword(input.password, await dummyHash()); // equalize timing
    return { ok: false, error: "invalid_credentials" };
  }
  const passwordOk = await verifyPassword(input.password, cred.passwordHash);
  if (!passwordOk) return { ok: false, error: "invalid_credentials" };

  const user = await deps.users.findByEmail(input.email);
  if (user === null) return { ok: false, error: "invalid_credentials" };
  return { ok: true, value: user };
}
