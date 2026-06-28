/**
 * Cabinet navigation config + active-state logic (FR-SHELL-01, TC-PURE-01).
 *
 * Framework-free: no `next/*`, no `react`, no `lucide-react`, no DOM. The nav
 * config carries only a stable `key` + `href`; labels are resolved from
 * `lib/i18n` and icons are mapped in `components/shell/` (where React/lucide are
 * allowed), both keyed by `key`. `isActiveNavItem` is a pure string function.
 */

/** Stable key used to resolve the label (i18n) and icon (components) by lookup. */
export type CabinetNavKey = "cycles" | "employees";

export type CabinetNavItem = {
  key: CabinetNavKey;
  href: string;
};

/** Ordered primary navigation: Cycles, then Employees. */
export const CABINET_NAV: readonly CabinetNavItem[] = [
  { key: "cycles", href: "/cycles" },
  { key: "employees", href: "/employees" },
];

/**
 * Whether a nav `href` is active for the current `pathname`: an exact match, or
 * a nested route under it at a path-segment boundary (`/cycles/123` under
 * `/cycles`). `/cyclesomething` is NOT active (boundary check), and the root
 * `/` never matches a non-root href. Pure and runtime-agnostic.
 */
export function isActiveNavItem(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}
