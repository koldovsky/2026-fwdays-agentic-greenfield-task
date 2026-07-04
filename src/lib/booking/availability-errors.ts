/** Map Playwright / network failures to resident-friendly copy (FR-AVAIL-04). */

export function friendlyAvailabilityError(raw: string): string {
  if (
    raw.includes("Timeout") &&
    (raw.includes("getByRole('link'") || raw.includes("calendar") || raw.includes("day"))
  ) {
    return "MHOA's calendar did not respond in time. The site may be slow, or this date may not be open yet. Try again, pick another day, or use Schedule later.";
  }
  if (raw.includes("Timeout") || raw.includes("timeout")) {
    return "MHOA took too long to respond. Try again in a moment.";
  }
  if (raw.includes("net::ERR") || raw.includes("ECONNREFUSED") || raw.includes("ENOTFOUND")) {
    return "Could not reach mahoganyhoa.com. Check your connection and try again.";
  }
  if (raw.includes("availability request timed out")) {
    return "Loading slots took too long on our server. Try again — only one MHOA lookup runs at a time.";
  }
  return "Could not load slots from MHOA. Try again or pick another date.";
}

export function friendlyAvailabilityErrorFromUnknown(err: unknown): string {
  if (err instanceof Error) return friendlyAvailabilityError(err.message);
  return friendlyAvailabilityError(String(err));
}
