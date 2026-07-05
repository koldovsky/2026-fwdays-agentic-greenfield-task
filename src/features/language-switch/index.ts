// Public API of the language-switch feature (add-language-toggle, NFR-I18N-01).
// Client-safe: server components resolve the locale inline via `parseLocale` +
// `cookies()` (shared/lib/i18n is framework-free, next/headers can't live here or
// it would poison the client bundle through the top bar).
export { LanguageSwitch, type LanguageSwitchProps } from "./ui/LanguageSwitch";
