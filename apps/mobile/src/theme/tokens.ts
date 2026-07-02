/**
 * Honeydo design tokens — the React Native source of truth, mirrored from
 * `.agents/skills/honeydo-design/tokens/*.css` (see DESIGN.md). Keep these in
 * sync with the skill tokens; never hardcode raw hex in screens/components.
 *
 * Color comes from the per-theme `palettes` map below via the semantic aliases
 * only (accent, text, surface…) — never reach past them. RN has no
 * `color-mix()`, so translucent fills are derived at runtime with `withAlpha`.
 */

/** Apply an alpha channel to a 6-digit hex color. Replaces CSS `color-mix`. */
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export type ColorScheme = 'light' | 'dark';

/** Semantic color aliases. Use these everywhere — never the raw hex. */
export interface Palette {
  bg: string;
  surface: string;
  surfaceAlt: string;
  accent: string;
  accentPressed: string;
  highlightGold: string;
  text: string;
  textMuted: string;
  border: string;
  success: string;
  successSoft: string;
  danger: string;
  onAccent: string;
}

const dark: Palette = {
  bg: '#1C1A17',
  surface: '#262220',
  surfaceAlt: '#2A2520',
  accent: '#FFB23E',
  accentPressed: '#E0922A',
  highlightGold: '#FFC75A',
  text: '#F4ECDD',
  textMuted: '#B8A88E',
  border: '#3A332B',
  success: '#7BC57F',
  successSoft: '#243023',
  danger: '#E07A5F',
  onAccent: '#2A1B05',
};

const light: Palette = {
  bg: '#FFFBF2',
  surface: '#FFFFFF',
  surfaceAlt: '#FFF4DE',
  accent: '#F5A300',
  accentPressed: '#C97A04',
  highlightGold: '#FFC75A',
  text: '#2A2118',
  textMuted: '#7A6A55',
  border: '#F0E2C8',
  success: '#3E8E4F',
  successSoft: '#E3F1DE',
  danger: '#C0492E',
  onAccent: '#2A1B05',
};

/** Semantic color palettes. Default scheme is `dark` (see DESIGN.md). */
export const palettes: Record<ColorScheme, Palette> = { light, dark };

/** Derived translucent fills, computed from a resolved palette. */
export function derivedFills(p: Palette) {
  return {
    runningGlow: withAlpha(p.accent, 0.55),
    runningGlowSoft: withAlpha(p.accent, 0.18),
    fillFaint: withAlpha(p.text, 0.06),
    fillSoft: withAlpha(p.text, 0.1),
    accentFaint: withAlpha(p.accent, 0.14),
    accentSoft: withAlpha(p.accent, 0.22),
  };
}

/** Spacing scale, 4pt base. Default screen gutter is `space[5]` (20). */
export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 32,
  8: 40,
  9: 56,
  10: 72,
} as const;

export const screenGutter = 20;

export const radius = {
  xs: 8,
  sm: 12,
  md: 16, // default card
  lg: 22, // sheet / large card
  xl: 28,
  pill: 999,
} as const;

/** Font families. On iOS the SF Pro names resolve natively; bundle Nunito /
 *  Nunito Sans via expo-font for non-Apple targets (see DESIGN.md). */
export const fonts = {
  rounded: 'SF Pro Rounded', // headings + numeric readouts
  text: 'SF Pro Text', // body
} as const;

export const fontSize = {
  timer: 56,
  display: 40,
  largeTitle: 34,
  title: 28,
  title2: 22,
  headline: 17,
  body: 17,
  callout: 16,
  subhead: 15,
  footnote: 13,
  caption: 12,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const;

export const lineHeight = {
  tight: 1.05,
  snug: 1.2,
  normal: 1.35,
  relaxed: 1.5,
} as const;

/** Motion durations (ms). Easing curves live in DESIGN.md; pair with Reanimated. */
export const duration = {
  fast: 140,
  base: 240,
  slow: 420,
  pour: 700,
} as const;

/** Warm-tinted shadows (rgba(42,27,5,…)) as RN style objects. */
export const shadow = {
  1: { shadowColor: '#2A1B05', shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  2: { shadowColor: '#2A1B05', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  3: { shadowColor: '#2A1B05', shadowOpacity: 0.1, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  4: { shadowColor: '#2A1B05', shadowOpacity: 0.14, shadowRadius: 40, shadowOffset: { width: 0, height: 16 }, elevation: 16 },
} as const;

export const layout = {
  tabBarHeight: 84,
  navHeight: 52,
  contentMax: 430,
} as const;
