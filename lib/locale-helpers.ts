const SCALE_NAMES = [
  "",
  "тисяч",
  "мільйон",
  "мільярд",
  "трильйон",
  "квадрильйон",
  "квінтильйон",
  "секстильйон",
  "септильйон",
  "октильйон",
  "нонильйон",
  "децильйон",
] as const;

const THOUSAND_ENDINGS = ["а", "і", ""] as const;
const OTHER_ENDINGS = ["", "и", "ів"] as const;

const ONES = [
  "",
  " один",
  " два",
  " три",
  " чотири",
  " п'ять",
  " шість",
  " сім",
  " вісім",
  " дев'ять",
] as const;

const TEENS = [
  " десять",
  " одинадцять",
  " дванадцять",
  " тринадцять",
  " чотирнадцять",
  " п'ятнадцять",
  " шістнадцять",
  " сімнадцять",
  " вісімнадцять",
  " дев'ятнадцять",
] as const;

const TENS = [
  "",
  "",
  " двадцять",
  " тридцять",
  " сорок",
  " п'ятдесят",
  " шістдесят",
  " сімдесят",
  " вісімдесят",
  " дев'яносто",
] as const;

const HUNDREDS = [
  "",
  " сто",
  " двісті",
  " триста",
  " чотириста",
  " п'ятсот",
  " шістсот",
  " сімсот",
  " вісімсот",
  " дев'ятсот",
] as const;

const FEMININE_ONES = ["", " одна", " дві"] as const;

const DECLENSION_INDEX = [2, 0, 1, 1, 1, 2, 2, 2, 2, 2] as const;

const MONTHS_GENITIVE = [
  "січня",
  "лютого",
  "березня",
  "квітня",
  "травня",
  "червня",
  "липня",
  "серпня",
  "вересня",
  "жовтня",
  "листопада",
  "грудня",
] as const;

const DATE_STRING_RE = /^(\d{2})\.(\d{2})\.(\d{4})$/;

function declOfNum(n: string, stem: string, endings: readonly [string, string, string]): string {
  if (stem === "") return "";
  const ending =
    n[n.length - 2] === "1"
      ? endings[2]
      : endings[DECLENSION_INDEX[Number(n[n.length - 1])]];
  return ` ${stem}${ending}`;
}

function tripletToWords(triplet: string, feminine: boolean): string {
  const hundreds = HUNDREDS[Number(triplet[0])];
  if (triplet[1] === "1") {
    return hundreds + TEENS[Number(triplet[2])];
  }
  const tens = TENS[Number(triplet[1])];
  const ones = feminine
    ? FEMININE_ONES[Number(triplet[2])] ?? ONES[Number(triplet[2])]
    : ONES[Number(triplet[2])];
  return hundreds + tens + ones;
}

function numLetters(digits: string): string {
  if (digits === "" || digits === "0") return " нуль";

  const groups = digits.split(/(?=(?:\d{3})+$)/);
  if (groups[0].length === 1) groups[0] = `00${groups[0]}`;
  if (groups[0].length === 2) groups[0] = `0${groups[0]}`;

  let result = "";
  for (let j = groups.length - 1; j >= 0; j--) {
    const group = groups[j];
    if (group === "000") continue;

    const scaleIndex = groups.length - 1 - j;
    const feminine =
      j === groups.length - 2 && (group[2] === "1" || group[2] === "2");
    const endings = j === groups.length - 2 ? THOUSAND_ENDINGS : OTHER_ENDINGS;

    result =
      tripletToWords(group, feminine) +
      declOfNum(group, SCALE_NAMES[scaleIndex], endings) +
      result;
  }

  return result;
}

function capitalizeFirstLetter(value: string): string {
  // Legacy output starts with a leading space; capitalize the first letter after it.
  if (value.length < 2) return value;
  return value[1].toUpperCase() + value.substring(2);
}

/**
 * Convert a UAH amount to Ukrainian amount-in-words with гривня/копійки.
 */
export function amountToCursive(n: number): string {
  const [hryvni, kopiyky] = Number(n).toFixed(2).split(".");
  let value =
    capitalizeFirstLetter(
      numLetters(hryvni) +
        declOfNum(hryvni, "грив", ["ня", "ні", "ень"]) +
        ` ${kopiyky}` +
        declOfNum(kopiyky, "копі", ["йка", "йки", "йок"]),
    );

  value = value.replace("Один гривня", "Одна гривня");
  value = value.replace("Два гривні", "Дві гривні");
  value = value.replace("один гривня", "одна гривня");
  value = value.replace("два гривні", "дві гривні");

  return value;
}

function parseDateParts(d: Date | string): { day: number; month: number; year: number } {
  if (typeof d === "string") {
    const match = DATE_STRING_RE.exec(d);
    if (!match) {
      throw new Error(`Invalid date string: ${d}`);
    }
    return {
      day: Number(match[1]),
      month: Number(match[2]),
      year: Number(match[3]),
    };
  }

  return {
    day: d.getDate(),
    month: d.getMonth() + 1,
    year: d.getFullYear(),
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Format a date as DD.MM.YYYY.
 */
export function dateToNumeric(d: Date | string): string {
  const { day, month, year } = parseDateParts(d);
  return `${pad2(day)}.${pad2(month)}.${year}`;
}

/**
 * Format a date as Ukrainian cursive: "D місяця YYYY р."
 */
export function dateToCursive(d: Date | string): string {
  const { day, month, year } = parseDateParts(d);
  const monthName = MONTHS_GENITIVE[month - 1];
  if (!monthName) {
    throw new Error(`Invalid month: ${month}`);
  }
  return `${day} ${monthName} ${year} р.`;
}
