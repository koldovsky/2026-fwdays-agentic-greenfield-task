// «Поливайко» botanical line-icon set (design D5, FR-DS-04). Inline SVG React
// components, single-color via `currentColor` so the consumer sets the color
// (`text-forest` / `text-bark`). Every glyph: fill none, stroke 1.8, round
// caps/joins. Decorative by default (aria-hidden); when a `title` is given the
// root becomes role="img" with a <title> for an accessible name (NFR-A11Y-04).
//
// The water-drop is BOTH the brand glyph and the water action — the same
// component is reused in both, kept visually consistent (FR-DS-04).

import type { ReactNode, SVGProps } from "react";

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "title"> {
  /** Pixel size for width + height (default 24; design uses 15–34). */
  size?: number;
  /** Accessible name. When given, the icon is exposed as role="img". */
  title?: string;
}

function Icon({
  size = 24,
  title,
  children,
  ...rest
}: IconProps & { children: ReactNode }) {
  const labelled = title != null && title !== "";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={labelled ? "img" : undefined}
      aria-hidden={labelled ? undefined : true}
      {...rest}
    >
      {labelled ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function WaterDropIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3c3.2 3.6 5.5 6.6 5.5 9.6A5.5 5.5 0 0 1 12 18a5.5 5.5 0 0 1-5.5-5.4C6.5 9.6 8.8 6.6 12 3Z" />
      <path d="M9.5 12.5a2.5 2.5 0 0 0 2 2.2" />
    </Icon>
  );
}

export function LeafIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 19c0-7 4.5-12 13-13 .5 7-3 13-13 13Z" />
      <path d="M5 19c4-4 7-6.5 10-8" />
    </Icon>
  );
}

export function SproutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 20v-7" />
      <path d="M12 13C12 9 9 7 5 7c0 4 3 6 7 6Z" />
      <path d="M12 11c0-3.3 2.7-5 6-5 0 3.3-2.7 5-6 5Z" />
    </Icon>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2" />
      <path d="M12 19v2" />
      <path d="M3 12h2" />
      <path d="M19 12h2" />
      <path d="M5.6 5.6 7 7" />
      <path d="M17 17l1.4 1.4" />
      <path d="M18.4 5.6 17 7" />
      <path d="M7 17l-1.4 1.4" />
    </Icon>
  );
}

export function PotIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 10h12" />
      <path d="M7 10l1.2 8.2a1.5 1.5 0 0 0 1.5 1.3h4.6a1.5 1.5 0 0 0 1.5-1.3L17 10" />
      <path d="M12 10c0-3 1.5-5 4-5" />
      <path d="M12 10C12 7 10 5 7 5" />
    </Icon>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 1.5 6 1.5 6h-15S6 14 6 9Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </Icon>
  );
}
