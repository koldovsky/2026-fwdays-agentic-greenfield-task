"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  readTheme,
  writeTheme,
  type Theme,
} from "@/lib/storage";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Starts at "light" on both server and client so the first client render matches
  // the server-rendered HTML exactly — reading localStorage here (during render)
  // would make the client's first paint diverge from SSR whenever a theme was
  // already stored, causing a hydration mismatch in anything that renders
  // differently per theme (e.g. ThemeToggle's icon/label). The stored theme is
  // applied post-mount instead, matching the inline bootstrap script in
  // app/layout.tsx that already avoids a flash of the wrong theme colors.
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const stored = readTheme();
    setThemeState(stored);
    applyTheme(stored);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    writeTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      applyTheme(next);
      writeTheme(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
