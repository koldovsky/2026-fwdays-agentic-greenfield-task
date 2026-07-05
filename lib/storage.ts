export const STORAGE_KEYS = {
  theme: "notely:theme:v1",
  sidebarCollapsed: "notely:sidebar-collapsed:v1",
} as const;

export type Theme = "light" | "dark";

export function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage unavailable (private browsing, quota, etc.)
  }
}

export function readTheme(): Theme {
  const stored = readStorage(STORAGE_KEYS.theme);
  return stored === "dark" ? "dark" : "light";
}

export function writeTheme(theme: Theme): void {
  writeStorage(STORAGE_KEYS.theme, theme);
}

export function readSidebarCollapsed(): boolean {
  return readStorage(STORAGE_KEYS.sidebarCollapsed) === "true";
}

export function writeSidebarCollapsed(collapsed: boolean): void {
  writeStorage(STORAGE_KEYS.sidebarCollapsed, String(collapsed));
}
