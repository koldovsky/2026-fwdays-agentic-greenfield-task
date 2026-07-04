"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { toggleTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-labelledby="theme-toggle-label"
      className="focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span id="theme-toggle-label" className="sr-only">
        <span className="dark:hidden">{t("theme.switchToDark")}</span>
        <span className="hidden dark:inline">{t("theme.switchToLight")}</span>
      </span>
      <Sun className="hidden size-4 dark:block" aria-hidden />
      <Moon className="size-4 dark:hidden" aria-hidden />
    </Button>
  );
}
