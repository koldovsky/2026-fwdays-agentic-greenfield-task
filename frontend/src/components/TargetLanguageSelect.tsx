"use client";

/**
 * TargetLanguageSelect — `<select>` over the hardcoded ISO 639-1 list
 * (≥55 from `target_languages.ts`). Same-source-target warning per
 * F2 AC "Selecting the same language for source and target shows
 * guidance" (regression scenario in `translation-configuration.feature`).
 *
 * The `name` shown is `findLanguageName(code)`; the `value` is the
 * ISO 639-1 code.
 */

import { useId } from "react";

import { TARGET_LANGUAGES, findLanguageName } from "@/lib/target_languages";

export interface TargetLanguageSelectProps {
  /** The currently selected language code (or empty string for unset). */
  value: string;
  onChange: (code: string) => void;
  /** The source language code, used to render the same-source warning. */
  sourceCode?: string;
  /** id used by Playwright; defaults to a generated id. */
  id?: string;
  /** data-testid for the `<select>` element. */
  testId?: string;
  /** Required + accessible label text. */
  label: string;
  /** Optional placeholder shown when value === "". */
  placeholder?: string;
  /** When true, the same-source-target warning is shown. */
  showSameAsSourceWarning?: boolean;
}

export function TargetLanguageSelect({
  value,
  onChange,
  sourceCode,
  id,
  testId = "target-language",
  label,
  placeholder = "Select a language…",
  showSameAsSourceWarning = true,
}: TargetLanguageSelectProps) {
  const generatedId = useId();
  const selectId = id ?? `lang-${generatedId}`;

  const showWarning = showSameAsSourceWarning && sourceCode && value && sourceCode === value;

  return (
    <div className="target-language-select">
      <label htmlFor={selectId} className="target-language-select__label">
        {label}
      </label>
      <select
        id={selectId}
        data-testid={testId}
        className="target-language-select__select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {TARGET_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name} ({lang.code})
          </option>
        ))}
      </select>
      {showWarning ? (
        <p className="target-language-select__warning" role="note" data-testid="same-lang-warning">
          Source and target languages are identical. The translation will be a no-op for language
          content. Pick a different target language.
          {sourceCode ? ` (${findLanguageName(sourceCode)})` : ""}
        </p>
      ) : null}
    </div>
  );
}
