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
    cvLabel: "Текст резюме",
    jdLabel: "Опис вакансії",
    emptyState: "Тут з'явиться результат після адаптації резюме.",
    exportAction: "Експортувати результат",
  },
  uploadCv: {
    dropLabel: "Перетягніть сюди файл резюме",
    hint: "PDF або DOCX, до 5 МБ",
    browseAction: "Обрати файл",
    pending: "Витягуємо текст із файлу",
    error: {
      unsupportedType: "Підтримуються лише файли PDF та DOCX.",
      tooLarge: "Файл завеликий. Максимальний розмір — 5 МБ.",
      unparseable:
        "Не вдалося прочитати текст із цього файлу. Вставте текст резюме в поле нижче.",
      failed: "Не вдалося завантажити файл. Спробуйте ще раз.",
    },
  },
  tailorRun: {
    queued: "У черзі",
    processing: "Адаптуємо резюме",
    done: "Готово",
    failed: "Не вдалося адаптувати резюме. Спробуйте ще раз — ця спроба не врахована.",
    emptyInput: "Додайте текст резюме та опис вакансії.",
    rateLimited: "Безкоштовний ліміт адаптацій вичерпано. Увійдіть в акаунт або оновіть тариф, щоб продовжити.",
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
  checkout: {
    title: "Оплата",
    emulatorNotice: "Тестовий режим оплати. Кошти не списуються.",
    planLabel: "Тариф",
    planName: {
      pro: "Pro",
      job_hunt_pass: "Job-hunt Pass",
    },
    planPrice: {
      pro: "$12 на місяць",
      job_hunt_pass: "$19 одноразово, 30 днів",
    },
    succeedAction: "Емулювати успішну оплату",
    failAction: "Емулювати відмову",
    pending: "Обробляємо платіж",
    redirecting: "Готово. Повертаємо вас назад",
    declined: "Оплату відхилено. Кошти не списано, доступ не змінено.",
    retryAction: "Спробувати ще раз",
    error: "Щось пішло не так. Спробуйте ще раз.",
  },
  paywall: {
    regionLabel: "Оновлення тарифу",
    title: "Розблокуйте повний доступ",
    exportLead: "Експорт доступний на платних тарифах. Оберіть тариф, щоб продовжити.",
    limitLead: "Безкоштовний ліміт адаптацій вичерпано. Оберіть тариф, щоб продовжити.",
    dismissAction: "Не зараз",
  },
  upgrade: {
    planFeature: {
      pro: "Необмежені адаптації та чистий експорт у PDF і DOCX.",
      job_hunt_pass: "Все з Pro на 30 днів, без підписки.",
    },
    chooseAction: {
      pro: "Обрати Pro",
      job_hunt_pass: "Обрати Job-hunt Pass",
    },
    pending: "Відкриваємо оплату",
    error: "Не вдалося розпочати оплату. Спробуйте ще раз.",
  },
  billing: {
    title: "Тариф і оплата",
    lead: "Керуйте підпискою, рахунками та скасуванням.",
    currentPlanLabel: "Поточний тариф",
    planName: {
      free: "Безкоштовний",
      pro: "Pro",
      job_hunt_pass: "Job-hunt Pass",
    },
    renewsOnLabel: "Наступне продовження",
    expiresOnLabel: "Діє до",
    accessUntilLabel: "Доступ діє до",
    canceledNote:
      "Підписку скасовано. Наприкінці періоду тариф зміниться на безкоштовний: адаптації залишаться доступними для читання, а експорт буде закрито.",
    freeNote:
      "Ви на безкоштовному тарифі. Оберіть тариф, щоб розблокувати експорт і необмежені адаптації.",
    upgradeTitle: "Оновити тариф",
    invoicesTitle: "Рахунки",
    noInvoices: "Рахунків поки немає.",
    invoicePaidLabel: "Сплачено",
    cancelAction: "Скасувати підписку",
    cancelPending: "Скасовуємо",
    cancelError: "Не вдалося скасувати підписку. Спробуйте ще раз.",
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
