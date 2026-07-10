// Client-side locale cookie writer (add-language-toggle). Kept out of the React
// component so the `document.cookie` assignment is a plain side-effecting module
// function, not a mutation inside a component/hook (react-hooks/immutability).
// Browser-only; the server reads the same cookie via next/headers in the pages.
import { LOCALE_COOKIE, type Locale } from "@/shared/lib/i18n";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Persist the chosen locale for a year, path-wide, lax so navigations carry it.
 * Adds Secure over HTTPS (defense-in-depth) but not on plain-http local dev. */
export function persistLocaleCookie(locale: Locale): void {
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax${secure}`;
}
