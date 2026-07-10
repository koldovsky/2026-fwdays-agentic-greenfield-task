import type { CityLocation } from "@/lib/city-search/geocoding";

export type FooterJokeSeed = {
  latitude: number;
  longitude: number;
  date: string;
  name: string | null;
};

export const FOOTER_JOKES_UK = [
  "Якщо прогноз зміниться до суботи, винен не барометр, а вітряна карта.",
  "Парасолька в рюкзаку займає менше місця, ніж три версії прогнозу в чаті.",
  "Комфортний вихідний починається з одного спокійного погляду на карту.",
  "Сніг у прогнозі не просить вибачення, він просто просить теплі рукавички.",
  "Ясне небо не гарантує ідеальний пікнік, але полегшує планування.",
  "Вітер у прогнозі нагадує перевірити капюшон, а не переписувати весь маршрут.",
  "Дощ у таблиці порівняння вихідних звучить чесніше, ніж обіцянка сухого неба.",
  "Коли хмари повільні, план на поїздку теж може бути без поспіху.",
] as const;

export const OPEN_METEO_URL = "https://open-meteo.com/";
export const OPENSTREETMAP_URL = "https://www.openstreetmap.org/copyright";

export function buildFooterJokeSeed(
  location: CityLocation | null,
  date: Date,
): FooterJokeSeed {
  if (!location) {
    return {
      latitude: 0,
      longitude: 0,
      date: formatSeedDate(date),
      name: null,
    };
  }

  return {
    latitude: location.latitude,
    longitude: location.longitude,
    date: formatSeedDate(date),
    name: location.name,
  };
}

export function pickFooterJoke(seed: FooterJokeSeed): string {
  const key = [
    seed.latitude.toFixed(4),
    seed.longitude.toFixed(4),
    seed.date,
    seed.name ?? "default",
  ].join("|");

  const index = hashSeed(key) % FOOTER_JOKES_UK.length;
  return FOOTER_JOKES_UK[index] ?? FOOTER_JOKES_UK[0];
}

export function allFooterJokesValidTone(): boolean {
  return FOOTER_JOKES_UK.every((joke) => !joke.includes("!"));
}

function formatSeedDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function hashSeed(input: string): number {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }

  return hash;
}
