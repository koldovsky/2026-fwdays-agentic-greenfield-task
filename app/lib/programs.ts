/**
 * Program registry — the sample admissions dataset (program-data capability).
 *
 * TC-DATA-01: the MVP ships 11 sample universities with *illustrative* cutoff
 * scores, not an official registry. Static bundled data, no I/O. Every field in
 * §10 (registry, ≥3-year cutoff history, seats & cost, benefits) is populated
 * and internally consistent so `scoring-engine` and the UI can rely on it.
 *
 * BC-HONESTY-01: `DATA_AS_OF` / `DATA_SESSION` are first-class, surfaced in the
 * UI so users always see how fresh (and how illustrative) the data is.
 */
import type { Benefits, ElectiveSubject, Program } from "@/app/lib/types";

/** Admissions session the sample cutoffs describe. */
export const DATA_SESSION = 2024 as const;

/** Human-readable freshness label for the UI (BC-HONESTY-01). */
export const DATA_AS_OF = "Сесія 2024 · бюджет" as const;

/**
 * Note shown alongside the data: these are illustrative samples, not an
 * official registry (TC-DATA-01). Kept here so copy stays with the data.
 */
export const DATA_DISCLAIMER =
  "Дані — 11 навчальних прикладів, а не офіційний реєстр. Прохідні бали ілюстративні." as const;

const ELECTIVES_HUMANITIES: ElectiveSubject[] = ["Англійська", "Німецька"];
const ELECTIVES_MIXED: ElectiveSubject[] = [
  "Англійська",
  "Біологія",
  "Хімія",
  "Фізика",
  "Географія",
];
const ELECTIVES_TECH: ElectiveSubject[] = [
  "Англійська",
  "Фізика",
  "Хімія",
  "Біологія",
  "Географія",
];

/** The 11 sample programs (TC-DATA-01). */
export const PROGRAMS: readonly Program[] = [
  {
    id: "knu-j",
    uni: "КНУ ім. Шевченка",
    spec: "Журналістика",
    field: "Журналістика",
    city: "Київ",
    coeff: { ukr: 0.35, eng: 0.3, hist: 0.25, math: 0.1 },
    cutoffs: { 2022: 155, 2023: 159, 2024: 158.4 },
    budgetSeats: 30,
    tuition: "68 тис",
    dorm: true,
    electives: ELECTIVES_HUMANITIES,
  },
  {
    id: "kma-f",
    uni: "НаУКМА",
    spec: "Філологія",
    field: "Філологія",
    city: "Київ",
    coeff: { ukr: 0.35, eng: 0.3, hist: 0.25, math: 0.1 },
    cutoffs: { 2022: 151, 2023: 153, 2024: 148.1 },
    budgetSeats: 45,
    tuition: "52 тис",
    dorm: true,
    electives: ELECTIVES_HUMANITIES,
  },
  {
    id: "knu-l",
    uni: "КНУ ім. Шевченка",
    spec: "Право",
    field: "Право",
    city: "Київ",
    coeff: { ukr: 0.3, hist: 0.35, eng: 0.2, math: 0.15 },
    cutoffs: { 2022: 163, 2023: 167, 2024: 165.0 },
    budgetSeats: 60,
    tuition: "75 тис",
    dorm: true,
    electives: ELECTIVES_MIXED,
  },
  {
    id: "lnu-s",
    uni: "ЛНУ ім. Франка",
    spec: "Соціологія",
    field: "Соціологія",
    city: "Львів",
    coeff: { ukr: 0.3, hist: 0.3, eng: 0.2, math: 0.2 },
    cutoffs: { 2022: 139, 2023: 143, 2024: 141.0 },
    budgetSeats: 35,
    tuition: "38 тис",
    dorm: true,
    electives: ELECTIVES_MIXED,
  },
  {
    id: "kpi-cs",
    uni: "КПІ ім. Сікорського",
    spec: "Комп. науки",
    field: "Комп. науки",
    city: "Київ",
    coeff: { math: 0.45, eng: 0.25, ukr: 0.2, hist: 0.1 },
    cutoffs: { 2022: 168, 2023: 172, 2024: 170.0 },
    budgetSeats: 120,
    tuition: "60 тис",
    dorm: true,
    electives: ELECTIVES_TECH,
  },
  {
    id: "hnu-p",
    uni: "ХНУ ім. Каразіна",
    spec: "Психологія",
    field: "Психологія",
    city: "Харків",
    coeff: { ukr: 0.3, hist: 0.25, eng: 0.25, math: 0.2 },
    cutoffs: { 2022: 138, 2023: 141, 2024: 139.0 },
    budgetSeats: 40,
    tuition: "36 тис",
    dorm: true,
    electives: ELECTIVES_MIXED,
  },
  {
    id: "uku-j",
    uni: "УКУ",
    spec: "Журналістика",
    field: "Журналістика",
    city: "Львів",
    coeff: { ukr: 0.35, eng: 0.3, hist: 0.25, math: 0.1 },
    cutoffs: { 2022: 149, 2023: 151, 2024: 150.0 },
    budgetSeats: 25,
    tuition: "80 тис",
    dorm: true,
    electives: ELECTIVES_HUMANITIES,
  },
  {
    id: "onu-ir",
    uni: "ОНУ ім. Мечникова",
    spec: "Міжнар. відносини",
    field: "Міжнар. відносини",
    city: "Одеса",
    coeff: { eng: 0.35, ukr: 0.25, hist: 0.25, math: 0.15 },
    cutoffs: { 2022: 150, 2023: 153, 2024: 152.0 },
    budgetSeats: 28,
    tuition: "55 тис",
    dorm: true,
    electives: ELECTIVES_HUMANITIES,
  },
  {
    id: "lnu-e",
    uni: "ЛНУ ім. Франка",
    spec: "Філологія (англ.)",
    field: "Філологія",
    city: "Львів",
    coeff: { eng: 0.4, ukr: 0.3, hist: 0.15, math: 0.15 },
    cutoffs: { 2022: 145, 2023: 147, 2024: 146.0 },
    budgetSeats: 50,
    tuition: "50 тис",
    dorm: true,
    electives: ELECTIVES_HUMANITIES,
  },
  {
    id: "vnu-j",
    uni: "ВНУ ім. Лесі Українки",
    spec: "Журналістика",
    field: "Журналістика",
    city: "Луцьк",
    coeff: { ukr: 0.35, eng: 0.3, hist: 0.25, math: 0.1 },
    cutoffs: { 2022: 130, 2023: 133, 2024: 132.0 },
    budgetSeats: 32,
    tuition: "30 тис",
    dorm: true,
    electives: ELECTIVES_HUMANITIES,
  },
  {
    id: "sumdu-m",
    uni: "СумДУ",
    spec: "Менеджмент",
    field: "Менеджмент",
    city: "Суми",
    coeff: { math: 0.3, ukr: 0.3, eng: 0.25, hist: 0.15 },
    cutoffs: { 2022: 126, 2023: 129, 2024: 128.0 },
    budgetSeats: 40,
    tuition: "32 тис",
    dorm: true,
    electives: ELECTIVES_MIXED,
  },
];

/** All distinct fields, in dataset order (for filter chips). */
export const FIELDS: readonly string[] = [
  ...new Set(PROGRAMS.map((p) => p.field)),
];

/** All distinct cities, in dataset order (for filter chips). */
export const CITIES: readonly string[] = [
  ...new Set(PROGRAMS.map((p) => p.city)),
];

/** Look up a program by id. */
export function getProgram(id: string): Program | undefined {
  return PROGRAMS.find((p) => p.id === id);
}

/** Benefit catalog: id, label, description, and score effect (§10, FR-INPUT-03). */
export interface BenefitDef {
  key: keyof Benefits;
  label: string;
  desc: string;
  /** Additive bonus fraction applied to the raw score (e.g. 0.02 → +2 %). */
  bonus: number;
}

export const BENEFITS: readonly BenefitDef[] = [
  {
    key: "village",
    label: "Сільський коефіцієнт",
    desc: "×1.02 до балу за сільську школу",
    bonus: 0.02,
  },
  {
    key: "quota",
    label: "Пільгова квота",
    desc: "окремий конкурс для пільгових категорій",
    bonus: 0.04,
  },
  {
    key: "orphan",
    label: "Особливі умови",
    desc: "діти-сироти, ВПО, статус УБД у родині",
    bonus: 0.02,
  },
];
