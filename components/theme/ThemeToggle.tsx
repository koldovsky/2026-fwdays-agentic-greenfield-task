"use client";

// Theme toggle button (client island, design.md D1/D2) — FR-SHELL-02,
// NFR-A11Y-04. A real <button> so it is keyboard-operable by default
// (focusable, Enter/Space activation); accessible name comes from the uk copy.

import { useTheme } from "@/components/theme/ThemeProvider";
import { uk } from "@/lib/i18n/uk";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={uk.theme.toggleLabel}
      aria-pressed={isDark}
      className="inline-flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
    >
      <span aria-hidden="true">{isDark ? "☾" : "☀"}</span>
      <span>{isDark ? uk.theme.dark : uk.theme.light}</span>
    </button>
  );
}
