"use client";

import type { ReactNode } from "react";
import { Switch } from "@notely-design/components";
import { useTheme } from "@/app/components/providers/theme-provider";

function SettingsRow({
  title,
  description,
  control,
}: {
  title: string;
  description: string;
  control: ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 py-3.5">
      <div className="min-w-0 flex-1">
        <div
          className="text-sm font-semibold"
          style={{ color: "var(--color-text)" }}
        >
          {title}
        </div>
        <div
          className="mt-0.5 text-[13px]"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {description}
        </div>
      </div>
      {control}
    </div>
  );
}

export function SettingsView() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="mx-auto max-w-[640px] px-4 py-10 sm:px-8 sm:py-16">
      <h1
        className="t-h1 mb-6"
        style={{ color: "var(--color-text)" }}
      >
        Settings
      </h1>

      <p
        className="mb-6 text-xs font-semibold uppercase tracking-wide"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        Appearance
      </p>

      <SettingsRow
        title="Dark theme"
        description="Use a darker palette in low light."
        control={
          <Switch
            checked={isDark}
            onChange={() => toggleTheme()}
            aria-label="Dark theme"
          />
        }
      />
    </div>
  );
}
