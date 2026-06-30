"use client";

import { Switch } from "@/components/ds";
import { useThemePreference } from "./useThemePreference";

/** @trace FR-SHELL-01 @trace FR-SHELL-03 */
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
            <span className="app-header__title">Гривня</span>
            <span className="app-header__subtitle">Офіційний курс НБУ</span>
          </div>
        </div>
        <Switch
          checked={dark}
          onChange={setDark}
          label="Темна тема"
        />
      </div>
    </header>
  );
}
