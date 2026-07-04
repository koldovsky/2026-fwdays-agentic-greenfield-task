"use client";

import { IconButton } from "@notely-design/components";
import { IconMoon, IconSun } from "@/app/components/icons";
import { useTheme } from "@/app/components/providers/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <IconButton
      icon={isDark ? <IconSun /> : <IconMoon />}
      label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      variant="ghost"
      onClick={toggleTheme}
    />
  );
}
