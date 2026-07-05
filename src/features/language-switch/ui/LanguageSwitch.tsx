"use client";

// Language switch (add-language-toggle, FR-SHELL-01, NFR-I18N-01, NFR-A11Y-01). A
// compact UA | EN segmented control. Selecting a locale writes the `locale`
// cookie client-side and refreshes the route so the server re-renders every
// localized view in the chosen language (no URL locale prefix). The active option
// is exposed to assistive tech via aria-pressed; the group carries an
// accessible name. Codes ("UA"/"EN") are locale-neutral, so they are not
// translated; only the group label is.
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALES, t, type Locale } from "@/shared/lib/i18n";
import { persistLocaleCookie } from "../lib/cookie";

const CODE: Readonly<Record<Locale, string>> = { ua: "UA", en: "EN" };

export interface LanguageSwitchProps {
  /** Current locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
}

export function LanguageSwitch({ locale = "ua" }: LanguageSwitchProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const copy = t(locale);

  function choose(next: Locale) {
    if (next === locale) return;
    persistLocaleCookie(next);
    startTransition(() => router.refresh());
  }

  return (
    <div
      role="group"
      aria-label={copy.topBar.languageLabel}
      className="inline-flex items-center rounded-sm border border-hairline bg-surface-card p-[2px]"
    >
      {LOCALES.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            aria-pressed={active}
            disabled={pending}
            onClick={() => choose(code)}
            className={
              "rounded-xs px-2 py-[3px] font-mono text-[11px] font-bold uppercase tracking-wide transition-colors " +
              (active
                ? "bg-brand-wash text-brand"
                : "text-ink-muted hover:text-ink disabled:opacity-60")
            }
          >
            {CODE[code]}
          </button>
        );
      })}
    </div>
  );
}
