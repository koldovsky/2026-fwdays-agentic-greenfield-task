/**
 * Ukrainian-first UI strings (NFR-I18N-01), centralised here. Sentence case,
 * calm and confidential tone, no exclamation marks, no emoji (DESIGN.md). The
 * shape of this object is the canonical `Messages` type; `en.ts` mirrors it.
 */
export const uk = {
  auth: {
    signInTitle: "Вхід до кабінету",
    signInSubtitle: "Внутрішній інструмент оцінювання Kolo360",
    emailLabel: "Робоча пошта",
    passwordLabel: "Пароль",
    submit: "Увійти",
    submitting: "Вхід…",
    invalidCredentials: "Невірний email або пароль",
    genericError: "Не вдалося увійти. Спробуйте ще раз",
  },
  shell: {
    nav: {
      label: "Основна навігація",
      cycles: "Цикли",
      employees: "Працівники",
    },
    signedInAs: "Ви увійшли як",
    signOut: "Вийти",
    states: {
      loading: "Завантаження…",
      emptyTitle: "Поки що порожньо",
      emptyBody: "Тут ще немає записів",
      errorTitle: "Не вдалося завантажити",
      errorBody: "Сталася помилка під час завантаження. Спробуйте ще раз",
      retry: "Спробувати ще раз",
    },
  },
};

export type Messages = typeof uk;
