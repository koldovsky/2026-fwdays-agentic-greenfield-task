"use client";

// ThemeProvider (client island, design.md D1/D2) — FR-SHELL-02.
// Source of truth for the theme is the `dark` class on <html>, which the
// pre-hydration no-flash script applies before first paint. This provider
// reflects that class into React via useSyncExternalStore (so the SSR snapshot
// uses the default and the client subscribes to real changes — no setState-in-
// effect, no hydration drift on the toggle label). `toggle()` flips the class,
// persists the choice, and notifies subscribers.

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";

import { DEFAULT_THEME, persistTheme, readTheme, type Theme } from "@/lib/theme/persistence";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getClientTheme(): Theme {
  if (typeof document === "undefined") return DEFAULT_THEME;
  return document.documentElement.classList.contains("dark") ? "dark" : readTheme();
}

function setTheme(next: Theme) {
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", next === "dark");
  }
  persistTheme(next);
  emit();
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getClientTheme, () => DEFAULT_THEME);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme]);

  return <ThemeContext value={{ theme, toggle }}>{children}</ThemeContext>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
