// Auth.js (next-auth v5) wiring — the app-layer session boundary (TC-STACK-07,
// FR-AUTH-01). Credentials provider delegates to the framework-free
// shared/lib/auth service (scrypt, uniform errors); sessions are stateless JWTs
// so no session table is needed. Google OAuth (FR-AUTH-02) plugs in here later
// as a second provider once client credentials exist.
//
// Needs AUTH_SECRET in the environment (any 32+ byte random string).
import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authenticateWithPassword } from "@/shared/lib/auth";
import { createCredentialsRepo, createUserRepo } from "@/shared/lib/db";
import { getDb } from "@/shared/lib/db/pg";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (email === "" || password === "") return null;

        const db = getDb();
        const result = await authenticateWithPassword(
          { users: createUserRepo(db), credentials: createCredentialsRepo(db) },
          { email, password },
        );
        if (!result.ok) return null;
        return { id: result.value.id, email: result.value.email, name: result.value.name };
      },
    }),
  ],
  callbacks: {
    session({ session, token }) {
      if (typeof token.sub === "string") session.user.id = token.sub;
      return session;
    },
  },
});

/** Current user id from the session, or null when anonymous. */
export async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
