import { CalendarRange, Users, type LucideIcon } from "lucide-react";
import type { CabinetNavKey } from "@/lib/nav/cabinet-nav";

/**
 * Cabinet nav key → Lucide outline icon (FR-SHELL-01). Lives here, not in the
 * framework-free `lib/nav`, so React/lucide stay out of `lib/`. Keyed by the
 * pure `CabinetNavKey` so the mapping is exhaustive and type-checked.
 */
const NAV_ICONS: Record<CabinetNavKey, LucideIcon> = {
  cycles: CalendarRange,
  employees: Users,
};

export function navIcon(key: CabinetNavKey): LucideIcon {
  return NAV_ICONS[key];
}
