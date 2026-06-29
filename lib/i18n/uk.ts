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
  // Plants capability copy (slice 2) — labels, field validation messages,
  // empty state, delete-confirm prompt, not-found. Ukrainian text, English
  // identifiers (NFR-LOC-01). The validation messages are the source the
  // FieldError shows inline and the error-clarity eval grades.
  plants: {
    /** Empty-state copy shown on the list when there are no plants (FR-PLANT-08). */
    empty:
      "У вас ще немає жодної рослини. Додайте першу — і вона зʼявиться тут.",
    listTitle: "Мої рослини",
    add: "Додати рослину",
    addTitle: "Нова рослина",
    editTitle: "Редагувати рослину",
    edit: "Редагувати",
    save: "Зберегти",
    cancel: "Скасувати",
    nameLabel: "Назва",
    namePlaceholder: "Наприклад: Грошове дерево на підвіконні",
    speciesLabel: "Вид",
    speciesHint: "Можна змінити або залишити запропонований вид.",
    acquiredDateLabel: "Дата придбання",
    acquiredDateHint: "Необовʼязково. Не може бути в майбутньому.",
    noAcquiredDate: "Не вказано",
    // Detail field labels.
    detailSpecies: "Вид",
    detailAcquiredDate: "Дата придбання",
    // Delete-with-confirm control (FR-PLANT-07, SC-5).
    delete: "Видалити",
    deleteConfirmPrompt:
      "Видалити цю рослину разом з усіма її вимірюваннями та поливами? Цю дію не можна скасувати.",
    deleteConfirm: "Так, видалити",
    deleteCancel: "Скасувати",
    /** Friendly not-found result for an edit/delete of a missing plant. */
    notFound: "Цю рослину не знайдено. Можливо, її вже видалено.",
    fieldErrors: {
      nameRequired: "Вкажіть назву рослини.",
      nameTooLong: "Назва має містити не більше 200 символів.",
      speciesTooLong: "Вид має містити не більше 200 символів.",
      acquiredDateInvalid: "Вкажіть коректну дату у форматі ДД.ММ.РРРР.",
      acquiredDateFuture:
        "Дата придбання не може бути в майбутньому. Оберіть сьогодні або раніше.",
    },
  },
  // Growth capability copy (slice 3) — section heading, the height + date field
  // labels/hints, add/save/cancel, list/row labels, empty state, delete-confirm
  // prompt, not-found, and the field validation messages the FieldError shows
  // inline and the error-clarity eval grades. Ukrainian text, English
  // identifiers (NFR-LOC-01).
  growth: {
    /** Section heading on the plant detail page. */
    sectionTitle: "Вимірювання росту",
    /** Empty-state copy when the plant has no measurements yet (FR-GROWTH-02). */
    empty:
      "Поки що немає жодного вимірювання. Запишіть перше — і ви побачите, як ваша рослина росте.",
    add: "Записати вимірювання",
    addTitle: "Нове вимірювання",
    edit: "Редагувати",
    save: "Зберегти",
    cancel: "Скасувати",
    heightLabel: "Висота (см)",
    heightHint:
      "Додатне число в сантиметрах. Дозволено одну цифру після коми, наприклад 12,5.",
    heightPlaceholder: "Наприклад: 12,5",
    measuredOnLabel: "Дата вимірювання",
    measuredOnHint: "За замовчуванням — сьогодні. Не може бути в майбутньому.",
    /** Row label: height in cm shown next to the date. */
    heightUnit: "см",
    // Delete-with-confirm control for a single measurement (SC-5).
    delete: "Видалити",
    deleteConfirmPrompt:
      "Видалити це вимірювання? Цю дію не можна скасувати.",
    deleteConfirm: "Так, видалити",
    deleteCancel: "Скасувати",
    /** Friendly not-found result for an edit/delete of a missing measurement. */
    notFound: "Це вимірювання не знайдено. Можливо, його вже видалено.",
    fieldErrors: {
      // Single, clear height message covering blank/non-numeric/negative/zero/
      // over-precision/over-bound: names what is wrong and hints a valid value
      // (a positive number in cm, decimals allowed) — blame-free, no codes.
      heightInvalid:
        "Вкажіть висоту як додатне число в сантиметрах (можна з однією цифрою після коми, наприклад 12,5).",
      dateInvalid: "Вкажіть коректну дату у форматі ДД.ММ.РРРР.",
      dateFuture:
        "Дата вимірювання не може бути в майбутньому. Оберіть сьогодні або раніше.",
    },
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
