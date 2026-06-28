// Ukrainian-first UI strings (NFR-I18N-01, BC-BRAND-01).
// Calm, practical voice — no exclamation marks anywhere. This is the
// canonical string source; `en.ts` mirrors these keys as a fallback.
// Plain object only — `lib/` stays framework-free (TC-PURE-01).

// The shape every locale must satisfy. `en.ts` is typed against this so the
// two files cannot drift apart.
export interface Strings {
  app: { name: string; tagline: string };
  theme: { light: string; dark: string; toggle: string };
  hero: { heading: string; subcopy: string };
  regions: { clock: string; search: string; forecast: string; footer: string; map: string };
  search: { placeholder: string; label: string; nothingFound: string };
  footer: {
    dataPrefix: string;
    mapPrefix: string;
    openMeteo: string;
    osm: string;
  };
  forecast: {
    sunrise: string;
    sunset: string;
    hourlyChartLabel: string;
    precipLabel: string;
    windLabel: string;
    loadingError: string;
    highLabel: string;
    lowLabel: string;
  };
  comfort: {
    good: string;
    cold: string;
    hot: string;
    rainy: string;
    windy: string;
    badgeLabel: string;
    weekendLabel: string;
  };
  map: {
    ariaLabel: string;
    reverseError: string;
  };
  compare: {
    toggle: string;
    pin: string;
    unpin: string;
    saturday: string;
    sunday: string;
    makeActive: string;
    noData: string;
    pinnedListLabel: string;
  };
  jokes: string[];
}

export const uk: Strings = {
  app: {
    name: "Надворі",
    tagline: "Weather Explorer",
  },
  theme: {
    light: "Денна тема",
    dark: "Нічна тема",
    toggle: "Перемкнути тему",
  },
  hero: {
    heading: "Куди поїхати на вихідні",
    subcopy:
      "Знайдіть місто і дізнайтесь, чи приємно там буде надворі. Один індекс комфорту замість пʼяти цифр.",
  },
  regions: {
    // Accessible labels for the placeholder slots later capabilities fill.
    clock: "Місцевий час",
    search: "Пошук міста",
    forecast: "Прогноз погоди",
    footer: "Підвал",
    map: "Інтерактивна карта",
  },
  search: {
    placeholder: "Знайдіть місто",
    label: "Пошук міста",
    nothingFound: "Нічого не знайдено",
  },
  footer: {
    dataPrefix: "Дані",
    mapPrefix: "Мапа",
    openMeteo: "Open-Meteo",
    osm: "OpenStreetMap",
  },
  forecast: {
    sunrise: "Схід сонця",
    sunset: "Захід сонця",
    hourlyChartLabel: "Температура на наступні 48 годин",
    precipLabel: "Опади",
    windLabel: "Вітер",
    loadingError: "Не вдалося завантажити прогноз",
    highLabel: "макс",
    lowLabel: "мін",
  },
  comfort: {
    good: "Надворі приємно — гарний день для прогулянки.",
    cold: "Відчувається холодно — одягайтесь тепліше.",
    hot: "Дуже спекотно — тримайтесь у тіні.",
    rainy: "Висока ймовірність дощу — візьміть парасольку.",
    windy: "Сильний вітер — тримайте капелюха.",
    badgeLabel: "Комфорт",
    weekendLabel: "Вихідні",
  },
  map: {
    ariaLabel: "Інтерактивна карта — натисніть, щоб вибрати місце",
    reverseError: "Не вдалося визначити місце — спробуйте ще раз",
  },
  compare: {
    toggle: "Порівняти вихідні",
    pin: "Закріпити",
    unpin: "Відкріпити",
    saturday: "Субота",
    sunday: "Неділя",
    makeActive: "Зробити активним",
    noData: "—",
    pinnedListLabel: "Закріплені міста",
  },
  jokes: [
    "Синоптики знову обіцяють сонце — беріть парасольку.",
    "Якщо хмари зібралися над містом, значить вони теж шукають wifi.",
    "Вітер змінив напрямок — мабуть, теж не знає, куди йде.",
    "Сніг у квітні — природа тестує стресостійкість.",
    "Дощ іде третій день поспіль, але прогноз каже «мінливо».",
    "Туман такий густий, що навіть компас задумався.",
    "Мороз щипає за щоки — значить, вийшов без шапки знову.",
    "Спека плюс вологість — це не літо, це парова лазня.",
    "Гроза прийшла рівно о 18:00, як і щодня цього місяця.",
    "Хмарно, але без опадів — класика українського передмістя.",
    "Ранковий іній перетворив траву на срібну килимову доріжку.",
    "Веселка після дощу — природа вибачається за учорашнє.",
  ],
};
