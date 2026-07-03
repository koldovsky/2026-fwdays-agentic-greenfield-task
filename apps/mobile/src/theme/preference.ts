import * as SecureStore from 'expo-secure-store';

/** The user's appearance intent. `system` follows the OS; default is `dark` (DESIGN.md). */
export type AppearancePreference = 'light' | 'dark' | 'system';

const KEY = 'honeydo.themePreference';

/** Persisted preference, or `dark` when unset/invalid. Reuses secure-store (no new native dep). */
export async function loadPreference(): Promise<AppearancePreference> {
  const value = await SecureStore.getItemAsync(KEY);
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'dark';
}

/** Fire-and-forget persist; state applies immediately, storage catches up in the background. */
export function savePreference(preference: AppearancePreference): void {
  void SecureStore.setItemAsync(KEY, preference);
}
