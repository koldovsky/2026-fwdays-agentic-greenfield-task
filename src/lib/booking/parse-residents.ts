import { RESIDENT_PROFILES } from "@/lib/booking/residents";

/** Extract resident profile ids mentioned in NL text (Max, Nataliia, …). */
export function parseResidentIds(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const r of RESIDENT_PROFILES) {
    if (
      lower.includes(r.label.toLowerCase()) ||
      lower.includes(r.fullName.toLowerCase()) ||
      lower.includes(r.fullName.split(" ")[0]!.toLowerCase())
    ) {
      found.push(r.id);
    }
  }
  return [...new Set(found)];
}
