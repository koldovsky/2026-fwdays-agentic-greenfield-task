import * as SecureStore from 'expo-secure-store';
import type { AuthTokens } from '@honeydo/shared';

// Tokens live in the device secure enclave/keystore, never AsyncStorage (NFR-SEC-01).
const ACCESS_KEY = 'honeydo.accessToken';
const REFRESH_KEY = 'honeydo.refreshToken';

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken);
  await SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken);
}

export function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_KEY);
}

export function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}
