function parseIsoMinutes(iso: string): number | null {
  const match = iso.match(/T(\d{2}):(\d{2})/);

  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function getZonedMinutes(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);

  return hour * 60 + minute;
}

export function isLocationDaytime(
  now: Date,
  sunriseIso: string | null,
  sunsetIso: string | null,
  timeZone: string | null,
): boolean {
  if (!sunriseIso || !sunsetIso) {
    return true;
  }

  const sunriseMinutes = parseIsoMinutes(sunriseIso);
  const sunsetMinutes = parseIsoMinutes(sunsetIso);

  if (sunriseMinutes === null || sunsetMinutes === null) {
    return true;
  }

  const nowMinutes = timeZone
    ? getZonedMinutes(now, timeZone)
    : now.getHours() * 60 + now.getMinutes();

  return nowMinutes >= sunriseMinutes && nowMinutes < sunsetMinutes;
}
