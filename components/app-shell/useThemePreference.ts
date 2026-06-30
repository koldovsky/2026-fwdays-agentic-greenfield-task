"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  THEME_STORAGE_KEY,
  parseThemePreference,
  themeToDataAttribute,
  themeToStorageValue,
  type ThemePreference,
} from "@/lib/theme/theme";

function readStoredTheme(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "light";
  }
}

function applyTheme(theme: ThemePreference) {
  const attr = themeToDataAttribute(theme);
  if (attr) {
    document.documentElement.dataset.theme = attr;
  } else {
    delete document.documentElement.dataset.theme;
  }
}

function persistTheme(theme: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeToStorageValue(theme));
  } catch {
    // private mode / quota — session-only theme
  }
}

const listeners = new Set<() => void>();

let preference: ThemePreference =
  typeof window !== "undefined" ? readStoredTheme() : "light";

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ThemePreference {
  return preference;
}

function getServerSnapshot(): ThemePreference {
  return "light";
}

function setPreference(next: ThemePreference) {
  preference = next;
  applyTheme(next);
  persistTheme(next);
  listeners.forEach((listener) => listener());
}

/** Client theme hook — syncs Switch with localStorage after ThemeScript bootstrap. */
export function useThemePreference() {
  const theme = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setDark = useCallback((dark: boolean) => {
    setPreference(dark ? "dark" : "light");
  }, []);

  return { dark: theme === "dark", setDark };
}
