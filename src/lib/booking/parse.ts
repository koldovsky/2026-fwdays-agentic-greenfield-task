import type { FacilityType } from "@/lib/booking/types";

export type ParsedBookingIntent = {
  facility: FacilityType;
  date: string; // YYYY-MM-DD
  windowStart: string; // HH:mm 24h
  windowEnd: string;
  slotDurationMinutes: number;
  courtOrSite: string | null;
  slotsRequested: number;
  ambiguities: string[];
};

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function nextIsoWeekMonday(from: Date) {
  const base = startOfDay(from);
  const day = base.getDay();
  const iso = day === 0 ? 7 : day;
  return addDays(base, 8 - iso);
}

function dateInNextIsoWeek(from: Date, weekday: number) {
  const monday = nextIsoWeekMonday(from);
  if (weekday === 1) return monday;
  return addDays(monday, weekday === 0 ? 6 : weekday - 1);
}

function parseExplicitDate(text: string, reference: Date): Date | null {
  const iso = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }

  const slash = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (slash) {
    const year = slash[3]
      ? Number(slash[3].length === 2 ? `20${slash[3]}` : slash[3])
      : reference.getFullYear();
    return new Date(year, Number(slash[1]) - 1, Number(slash[2]));
  }

  const monthDay = text.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(20\d{2}))?\b/i,
  );
  if (monthDay) {
    const months =
      "january,february,march,april,may,june,july,august,september,october,november,december".split(
        ",",
      );
    const month = months.indexOf(monthDay[1].toLowerCase());
    const year = monthDay[3] ? Number(monthDay[3]) : reference.getFullYear();
    return new Date(year, month, Number(monthDay[2]));
  }

  return null;
}

function parseDate(text: string, reference: Date): { date: Date; ambiguities: string[] } {
  const lower = text.toLowerCase();
  const ambiguities: string[] = [];

  const explicit = parseExplicitDate(text, reference);
  if (explicit) return { date: startOfDay(explicit), ambiguities };

  if (/\btomorrow\b/.test(lower)) {
    return { date: addDays(startOfDay(reference), 1), ambiguities };
  }

  const weekdayMatch = lower.match(
    /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/,
  );
  if (weekdayMatch) {
    const weekday = WEEKDAYS[weekdayMatch[1]];
    const nextWeek = /\bnext week\b/.test(lower);
    const thisWeek = /\bthis week\b/.test(lower);

    if (nextWeek && weekdayMatch.index !== undefined) {
      return { date: dateInNextIsoWeek(reference, weekday), ambiguities };
    }

    if (thisWeek) {
      const d = addDays(startOfDay(reference), (weekday - reference.getDay() + 7) % 7 || 7);
      if (d <= startOfDay(reference)) {
        return { date: addDays(d, 7), ambiguities };
      }
      return { date: d, ambiguities };
    }

    const delta = (weekday - reference.getDay() + 7) % 7 || 7;
    return { date: addDays(startOfDay(reference), delta), ambiguities };
  }

  if (/\bnext week\b/.test(lower)) {
    ambiguities.push("No weekday given — using Monday of next week.");
    return { date: nextIsoWeekMonday(reference), ambiguities };
  }

  ambiguities.push("Could not detect a date — using next eligible weekday (Monday).");
  return { date: nextIsoWeekMonday(reference), ambiguities };
}

function parseTimeToken(token: string): number | null {
  const m = token
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;

  let hour = Number(m[1]);
  const minute = m[2] ? Number(m[2]) : 0;
  const meridiem = m[3];

  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (!meridiem && hour <= 7) hour += 12; // bare "1" in afternoon context unlikely

  return hour * 60 + minute;
}

function minutesToHHmm(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${pad(h)}:${pad(m)}`;
}

function parseTimeWindow(
  text: string,
  ambiguities: string[],
): { windowStart: string; windowEnd: string } {
  const lower = text.toLowerCase();

  const timeToken = String.raw`\d{1,2}(?::\d{2})?\s*(?:am|pm)`;

  const between = lower.match(
    new RegExp(`between\\s+(${timeToken})\\s+and\\s+(${timeToken})`, "i"),
  );
  if (between) {
    const start = parseTimeToken(between[1]);
    const end = parseTimeToken(between[2]);
    if (start !== null && end !== null && end > start) {
      return {
        windowStart: minutesToHHmm(start),
        windowEnd: minutesToHHmm(end),
      };
    }
  }

  const range =
    lower.match(
      new RegExp(`(${timeToken})\\s*(?:to|till|until|-)\\s*(${timeToken})`, "i"),
    ) ??
    lower.match(
      new RegExp(
        `from\\s+(${timeToken})\\s*(?:to|till|until|-)\\s*(${timeToken})`,
        "i",
      ),
    );

  if (range) {
    const start = parseTimeToken(range[1]) ?? 9 * 60;
    let end = parseTimeToken(range[2]) ?? start + 45;

    const startMer = range[1].toLowerCase().includes("am");
    const endMer = range[2].toLowerCase();

    // Only treat 12 AM as noon typo when end is also AM and not a cross-meridiem range
    if (startMer && endMer.includes("am") && !endMer.includes("pm") && end <= start) {
      ambiguities.push("Interpreted “12 AM” as noon (12 PM) — likely typo.");
      end = 12 * 60;
    }

    if (end <= start) end = start + 45;

    return {
      windowStart: minutesToHHmm(start),
      windowEnd: minutesToHHmm(end),
    };
  }

  if (/\bmorning\b/.test(lower)) {
    return { windowStart: "09:00", windowEnd: "12:00" };
  }
  if (/\bafternoon\b/.test(lower)) {
    return { windowStart: "12:00", windowEnd: "17:00" };
  }
  if (/\bevening\b/.test(lower)) {
    return { windowStart: "17:00", windowEnd: "21:00" };
  }

  ambiguities.push("No time window detected — defaulting to 09:00–12:00.");
  return { windowStart: "09:00", windowEnd: "12:00" };
}

function parseCourtOrSite(text: string, facility: FacilityType): string | null {
  const lower = text.toLowerCase();
  if (facility === "tennis") {
    if (/\beast\b/.test(lower)) return "East Court";
    if (/\bwest\b/.test(lower)) return "West Court";
    return null;
  }

  if (/main beach\s*#?\s*1/i.test(text)) return "Main Beach #1";
  if (/main beach\s*#?\s*2/i.test(text)) return "Main Beach #2";
  if (/west beach\s*#?\s*1/i.test(text)) return "West Beach #1";
  if (/west beach\s*#?\s*2/i.test(text)) return "West Beach #2";
  if (/main beach/i.test(text)) return "Main Beach #1";
  if (/west beach/i.test(text)) return "West Beach #1";
  return null;
}

function parseSlotsRequested(text: string): number {
  const m = text.match(/\b(\d+)\s+slots?\b/i);
  return m ? Number(m[1]) : 1;
}

export function parseBookingRequest(
  text: string,
  facility: FacilityType,
  referenceDate: Date = new Date(),
): ParsedBookingIntent {
  const ambiguities: string[] = [];
  const { date, ambiguities: dateAmb } = parseDate(text, referenceDate);
  ambiguities.push(...dateAmb);

  const { windowStart, windowEnd } = parseTimeWindow(text, ambiguities);
  const courtOrSite = parseCourtOrSite(text, facility);
  const slotsRequested = parseSlotsRequested(text);

  const slotDurationMinutes = facility === "tennis" ? 45 : 210;

  return {
    facility,
    date: toIsoDate(date),
    windowStart,
    windowEnd,
    slotDurationMinutes,
    courtOrSite,
    slotsRequested,
    ambiguities,
  };
}
