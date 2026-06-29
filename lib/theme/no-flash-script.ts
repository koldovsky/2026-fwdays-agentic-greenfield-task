// Pre-hydration no-flash theme script (design.md D2, ADR-worthy) — FR-SHELL-02.
// This string is injected verbatim into a synchronous inline <script> in the
// <head> of app/layout.tsx. It runs BEFORE first paint: it reads the persisted
// theme from localStorage, falls back to the default if absent/unreadable/
// corrupt (wrapped in try/catch so a disabled store never throws), and sets the
// `dark` class on <html> so Tailwind's class-strategy dark variant is correct on
// the very first frame — no flash of the wrong theme.
//
// Exported as a module (rather than inlined in the layout) so it can be executed
// against a jsdom document in a unit test that pins the "applied before first
// paint" guarantee (a regression — e.g. removing the script — fails CI).
//
// @trace FR-SHELL-02

import { DEFAULT_THEME, THEME_STORAGE_KEY } from "@/lib/theme/persistence";

export const noFlashThemeScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t!=="light"&&t!=="dark"){t=${JSON.stringify(
  DEFAULT_THEME,
)};}document.documentElement.classList.toggle("dark",t==="dark");}catch(e){}})();`;
