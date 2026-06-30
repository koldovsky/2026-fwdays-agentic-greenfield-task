"use client";

import { Switch } from "@/components/ds";
import { uk } from "@/lib/i18n/uk";
import { useThemePreference } from "./useThemePreference";

/** @trace FR-SHELL-01 @trace FR-SHELL-03 @trace FR-I18N-01 */
export function AppHeader() {
  const { dark, setDark } = useThemePreference();

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div className="app-header__lockup">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-mark.svg"
            alt=""
            width={40}
            height={40}
            className="app-header__logo"
          />
          <div className="app-header__titles">
            <span className="app-header__title">{uk.shell.brandTitle}</span>
            <span className="app-header__subtitle">{uk.shell.brandSubtitle}</span>
          </div>
        </div>
        <Switch
          checked={dark}
          onChange={setDark}
          label={uk.shell.themeToggleLabel}
        />
      </div>
    </header>
  );
}
