import { CalendarRange, Users } from "lucide-react";
import type { ReactElement } from "react";
import type { CabinetNavKey } from "@/lib/nav/cabinet-nav";

/**
 * Cabinet nav key → a ready-to-render Lucide outline icon ELEMENT (FR-SHELL-01).
 * Returns an element rather than a component so callers never assign a component
 * to a capitalised local during render, and so a server parent never has to pass
 * a component function across the server → client boundary. Lives here, not in
 * the framework-free `lib/nav`, to keep React/lucide out of `lib/`. The `switch`
 * is exhaustive over `CabinetNavKey` (type-checked).
 */
export function navIcon(key: CabinetNavKey): ReactElement {
  const props = { "aria-hidden": true, size: 16, strokeWidth: 1.8, className: "shrink-0" } as const;
  switch (key) {
    case "cycles":
      return <CalendarRange {...props} />;
    case "employees":
      return <Users {...props} />;
  }
}
