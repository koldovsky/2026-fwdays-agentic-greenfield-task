/**
 * Auth API contracts shared between `apps/api` (producer) and `apps/mobile` (consumer).
 * Framework-free. `AuthUser` never carries a password or hash (NFR-SEC-01).
 */

export type AuthProvider = 'password' | 'google';

/** Public account shape returned to clients — never includes credentials. */
export interface AuthUser {
  id: string;
  email: string;
  /** Display name (from Google or the sign-up form); null when unknown. */
  name: string | null;
  /** Sign-in providers linked to this account. */
  providers: AuthProvider[];
}

/** Access + refresh token pair. Access is a short-lived JWT; refresh rotates. */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** Full sign-in/sign-up result: the user plus a fresh token pair. */
export interface AuthSession {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface SignUpRequest {
  email: string;
  password: string;
  /** Optional display name. */
  name?: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

/** Google sign-in: the client sends the Google-issued id_token for server verification. */
export interface GoogleSignInRequest {
  idToken: string;
}

export interface RefreshRequest {
  refreshToken: string;
}
