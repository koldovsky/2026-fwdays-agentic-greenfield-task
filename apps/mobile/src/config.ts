/**
 * Runtime config from Expo public env vars (EXPO_PUBLIC_*). Override in `.env` or the
 * shell; defaults target the local API on :3333.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3333';

/** Google **iOS** OAuth client id — identifies the native app in the sign-in flow. */
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';

/**
 * Google **Web** OAuth client id — the backend's identity. Passed as the id_token
 * audience (serverClientId) so the API verifies it against GOOGLE_CLIENT_ID.
 */
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
