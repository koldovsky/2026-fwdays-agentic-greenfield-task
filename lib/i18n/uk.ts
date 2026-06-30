/**
 * Centralised Ukrainian UI copy (FR-I18N-01, NFR-I18N-01).
 *
 * Single source of truth for every user-facing string. Components import and
 * read by dotted path (`uk.shell.brandTitle`) — TypeScript narrows each leaf
 * to its literal type, so a typo at a call site is a compile error. No
 * runtime i18n library; no lookup function (see design.md, Decision 1).
 *
 * Voice: Ukrainian-first, calm, no exclamation marks (BC-BRAND-01).
 */
export const uk = {
  shell: {
    brandTitle: "Гривня",
    brandSubtitle: "Офіційний курс НБУ",
    themeToggleLabel: "Темна тема",
    ratesColumnLabel: "Список курсів",
    focusColumnLabel: "Обрана валюта",
    footerProvenance: "Дані: відкритий API НБУ · без кук і трекерів",
  },
  rates: {
    loadError: "Не вдалося завантажити курс. Спробуйте ще раз.",
    retry: "Спробувати ще раз",
    selectPrompt: "Оберіть валюту зі списку зліва.",
  },
  picker: {
    placeholder: "Пошук за кодом або назвою",
    noMatch: "Нічого не знайдено",
  },
  converter: {
    amountInForeign: (code: string) => `Сума у ${code}`,
    amountInUah: "Сума у гривнях",
    resultInUah: "Це у гривнях",
    resultInForeign: (code: string) => `Це у ${code}`,
    swap: "Поміняти напрям",
  },
  history: {
    title: "Динаміка за останній місяць",
    loadError: "Не вдалося завантажити динаміку курсу.",
    empty: "Дані за цей період відсутні.",
  },
  meta: {
    title: "Гривня — офіційний курс НБУ",
    description:
      "Офіційний курс гривні до іноземних валют за даними Національного банку України: курс, конвертер і динаміка.",
  },
} as const;
