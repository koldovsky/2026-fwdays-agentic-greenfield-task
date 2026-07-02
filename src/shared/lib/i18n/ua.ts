// Ukrainian-first copy (NFR-I18N-01). No emoji, no exclamation points (BC-BRAND-01).
import type { Dictionary } from "./types";

export const ua: Dictionary = {
  app: {
    name: "Vouch",
  },
  action: {
    tailor: "Адаптувати",
  },
  checklist: {
    statusLabel: {
      met: "Підтверджено",
      partial: "Частково",
      gap: "Відсутнє",
      "overclaim-risk": "Ризик перебільшення",
    },
    scoreHeadline: "Відповідність вакансії",
  },
  bullets: {
    listLabel: "Адаптовані пункти",
    includeInExport: "Додати в експорт",
    excludedFromExport: "Виключено з експорту",
    source: "Джерело",
  },
  result: {
    regionLabel: "Результат адаптації",
    eyebrow: "Результат",
    title: "Адаптований профіль",
  },
  workspace: {
    lead: "Перевірте відповідність вакансії та оберіть пункти для експорту.",
  },
  auth: {
    signInTitle: "Вхід",
    signUpTitle: "Реєстрація",
    lead: "Одна безкоштовна адаптація доступна без акаунта. Вхід потрібен лише для експорту.",
    emailLabel: "Електронна пошта",
    passwordLabel: "Пароль",
    nameLabel: "Імʼя (необовʼязково)",
    signInAction: "Увійти",
    signUpAction: "Створити акаунт",
    signOutAction: "Вийти",
    noAccountPrompt: "Немає акаунта?",
    haveAccountPrompt: "Вже маєте акаунт?",
    error: {
      invalidCredentials: "Не вдалося увійти. Перевірте пошту та пароль.",
      emailTaken: "Ця пошта вже зареєстрована. Спробуйте увійти.",
      invalidEmail: "Вкажіть коректну електронну пошту.",
      weakPassword: "Пароль має містити щонайменше 8 символів.",
      generic: "Щось пішло не так. Спробуйте ще раз.",
    },
  },
  topBar: {
    homeLabel: "Vouch — на головну",
    accountLabel: "Акаунт",
    signIn: "Увійти",
    tryFree: "Спробувати",
    navFeatures: "Можливості",
    navPricing: "Тарифи",
  },
};
