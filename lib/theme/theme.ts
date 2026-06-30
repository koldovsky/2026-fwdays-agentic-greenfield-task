export type ThemePreference = "light" | "dark";

export const THEME_STORAGE_KEY = "hryvnia:theme:v1";

/** Parse stored value; unknown/missing → "light". Never throws. */
export function parseThemePreference(
  raw: string | null | undefined,
): ThemePreference {
  if (raw === "dark") return "dark";
  return "light";
}

/** Attribute value for `<html>`: "" (light default) or "dark". */
export function themeToDataAttribute(theme: ThemePreference): "" | "dark" {
  return theme === "dark" ? "dark" : "";
}

/** Serialise for localStorage. */
export function themeToStorageValue(theme: ThemePreference): ThemePreference {
  return theme;
}

/** Inline script body — mirrors parseThemePreference + themeToDataAttribute. */
export function themeBootstrapScript(): string {
  return `(function(){try{var r=localStorage.getItem("${THEME_STORAGE_KEY}");var t=r==="dark"?"dark":"";if(t)document.documentElement.dataset.theme=t;else delete document.documentElement.dataset.theme;}catch(e){}})();`;
}
