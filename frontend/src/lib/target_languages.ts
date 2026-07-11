/**
 * Hardcoded ISO 639-1 translation target language list.
 *
 * Source of truth: `docs/PRD.md §9 Appendix A — Translation Target Languages
 * (≥55, via TranslateGemma)`. The full enumerated list is shipped here as a
 * typed const array so the BDD "≥55 target languages" invariant is satisfied
 * without a runtime call to the backend.
 *
 * Per CONTEXT.md agent-discretion: "hardcode the ISO 639-1 code list in
 * `frontend/src/lib/target_languages.ts` as a typed const array. BDD '≥55'
 * assertion is testable as `arr.length >= 55`."
 *
 * BDD contract: `docs/features/translation-configuration.feature` scenario
 * "Target languages include at least 55 options" — see
 * `tests/steps/translation_config_steps.spec.ts` for the Playwright binding
 * and `tests/unit/target_languages.test.ts` for the unit-level invariant.
 *
 * `findLanguageName(code)` returns the human-readable name for a code
 * (case-insensitive). Unknown codes fall back to the code itself (graceful
 * fallback for languages the user might paste in but the dropdown does not
 * enumerate).
 */
export const TARGET_LANGUAGES = [
  { code: "af", name: "Afrikaans" },
  { code: "sq", name: "Albanian" },
  { code: "am", name: "Amharic" },
  { code: "ar", name: "Arabic" },
  { code: "hy", name: "Armenian" },
  { code: "as", name: "Assamese" },
  { code: "az", name: "Azerbaijani" },
  { code: "be", name: "Belarusian" },
  { code: "bn", name: "Bengali" },
  { code: "bs", name: "Bosnian" },
  { code: "bg", name: "Bulgarian" },
  { code: "my", name: "Burmese" },
  { code: "ca", name: "Catalan" },
  { code: "zh-CN", name: "Chinese (Simplified)" },
  { code: "zh-TW", name: "Chinese (Traditional)" },
  { code: "hr", name: "Croatian" },
  { code: "cs", name: "Czech" },
  { code: "da", name: "Danish" },
  { code: "nl", name: "Dutch" },
  { code: "en", name: "English" },
  { code: "et", name: "Estonian" },
  { code: "fi", name: "Finnish" },
  { code: "fr", name: "French" },
  { code: "gl", name: "Galician" },
  { code: "ka", name: "Georgian" },
  { code: "de", name: "German" },
  { code: "el", name: "Greek" },
  { code: "gu", name: "Gujarati" },
  { code: "he", name: "Hebrew" },
  { code: "hi", name: "Hindi" },
  { code: "hu", name: "Hungarian" },
  { code: "is", name: "Icelandic" },
  { code: "id", name: "Indonesian" },
  { code: "ga", name: "Irish" },
  { code: "it", name: "Italian" },
  { code: "ja", name: "Japanese" },
  { code: "jv", name: "Javanese" },
  { code: "kn", name: "Kannada" },
  { code: "kk", name: "Kazakh" },
  { code: "km", name: "Khmer" },
  { code: "ko", name: "Korean" },
  { code: "ku", name: "Kurdish" },
  { code: "lo", name: "Lao" },
  { code: "lv", name: "Latvian" },
  { code: "lt", name: "Lithuanian" },
  { code: "mk", name: "Macedonian" },
  { code: "ms", name: "Malay" },
  { code: "ml", name: "Malayalam" },
  { code: "mr", name: "Marathi" },
  { code: "ne", name: "Nepali" },
  { code: "no", name: "Norwegian" },
  { code: "ps", name: "Pashto" },
  { code: "fa", name: "Persian" },
  { code: "pl", name: "Polish" },
  { code: "pt-BR", name: "Portuguese (Brazil)" },
  { code: "pt-PT", name: "Portuguese (Portugal)" },
  { code: "pa", name: "Punjabi" },
  { code: "ro", name: "Romanian" },
  { code: "ru", name: "Russian" },
  { code: "sr", name: "Serbian" },
  { code: "si", name: "Sinhala" },
  { code: "sk", name: "Slovak" },
  { code: "sl", name: "Slovenian" },
  { code: "so", name: "Somali" },
  { code: "es", name: "Spanish" },
  { code: "su", name: "Sundanese" },
  { code: "sw", name: "Swahili" },
  { code: "sv", name: "Swedish" },
  { code: "tl", name: "Tagalog" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "th", name: "Thai" },
  { code: "tr", name: "Turkish" },
  { code: "uk", name: "Ukrainian" },
  { code: "ur", name: "Urdu" },
  { code: "uz", name: "Uzbek" },
  { code: "vi", name: "Vietnamese" },
  { code: "cy", name: "Welsh" },
  { code: "yo", name: "Yoruba" },
  { code: "zu", name: "Zulu" },
] as const satisfies ReadonlyArray<{ code: string; name: string }>;

export type LanguageCode = (typeof TARGET_LANGUAGES)[number]["code"];

/**
 * Look up the human-readable name for an ISO 639-1 (or BCP-47 for the
 * Chinese variants) language code. Case-insensitive. Unknown codes fall
 * back to the code itself (graceful fallback for languages the user might
 * paste in but the dropdown does not enumerate).
 */
export function findLanguageName(code: string): string {
  if (!code) return "";
  const normalised = code.toLowerCase();
  const hit = TARGET_LANGUAGES.find((l) => l.code.toLowerCase() === normalised);
  return hit ? hit.name : code;
}
