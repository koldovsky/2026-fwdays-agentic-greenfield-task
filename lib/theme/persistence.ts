// Theme persistence helper (design.md D2) — FR-SHELL-02.
// Theme is 'light' | 'dark', persisted under localStorage key `pgwt.theme`,
// default 'light'. All localStorage access is wrapped in try/catch so a
// disabled/unreadable/corrupt store falls back to the default WITHOUT throwing
// (Risk R4, corrupt-value scenario). The same key is read by the pre-hydration
// no-flash inline script in app/layout.tsx and by ThemeProvider.
//
// @trace FR-SHELL-02

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "pgwt.theme";
export const DEFAULT_THEME: Theme = "light";

/** Coerce an arbitrary stored value into a valid Theme, else the default. */
export function normalizeTheme(value: string | null | undefined): Theme {
  return value === "light" || value === "dark" ? value : DEFAULT_THEME;
}

/** Read the persisted theme; default on missing/corrupt/unreadable store. */
export function readTheme(): Theme {
  try {
    return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

/** Persist the chosen theme; never throws if the store is disabled. */
export function persistTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* storage disabled / unavailable — degrade silently, keep current UI */
  }
}
