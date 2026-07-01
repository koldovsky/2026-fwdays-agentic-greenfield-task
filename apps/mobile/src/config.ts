/**
 * Runtime config from Expo public env vars (EXPO_PUBLIC_*). Override in `.env` or the
 * shell; defaults target the local API on :3333.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3333';

/** Google OAuth client id for expo-auth-session; blank disables Google sign-in. */
export const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
