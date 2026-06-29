// Ukrainian copy module (design.md D6) — NFR-LOC-01.
// All shell-facing strings live here as named constants (Ukrainian text,
// English identifiers) so later slices reuse one consistent source instead of
// inline literals. No i18n switching (NFR-LOC-02 is Future) — Ukrainian only.

export const uk = {
  appTitle: "Трекер рослин",
  nav: {
    /** Primary list view (plants) link, points to `/`. */
    plants: "Рослини",
    /** Generic "back to list" affordance reused by detail/not-found views. */
    backToList: "Повернутися до списку",
  },
  theme: {
    /** Accessible name for the light/dark toggle button. */
    toggleLabel: "Перемкнути тему",
    light: "Світла тема",
    dark: "Темна тема",
  },
  notFound: {
    title: "Сторінку не знайдено",
    /** Generic copy for the global catch-all 404 (any unknown route). */
    genericDescription: "Сторінку за цією адресою не знайдено.",
    /** Plant-specific copy for the /plants/[id] not-found boundary. */
    description: "Рослину за цією адресою не знайдено.",
  },
  errors: {
    /** Generic whole-form failure (banner) when the cause is not field-specific. */
    generic: "Не вдалося зберегти запис. Спробуйте ще раз.",
  },
  // Example validation messages — exercised by the home demo form so the shared
  // inline-error contract (FR-SHELL-03) is provably wired. Real per-field
  // messages live with their domain in slices 2–5.
  example: {
    nameRequired: "Вкажіть назву рослини",
    formTitle: "Приклад форми",
    nameLabel: "Назва рослини",
    submit: "Зберегти",
    success: "Збережено",
  },
} as const;

export type UkCopy = typeof uk;
