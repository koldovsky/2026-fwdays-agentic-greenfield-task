/**
 * Honeydo theme context. Resolves the active color scheme (defaulting to Dark,
 * per DESIGN.md) and exposes the full token set plus derived fills through
 * `useTheme()`. The Light/Dark swap stays a single switch — screens read
 * `theme.colors.*`, never raw hex.
 */
import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import {
  type ColorScheme,
  type Palette,
  derivedFills,
  duration,
  fontSize,
  fontWeight,
  fonts,
  layout,
  lineHeight,
  palettes,
  radius,
  screenGutter,
  shadow,
  space,
} from './tokens';

export interface Theme {
  scheme: ColorScheme;
  colors: Palette & ReturnType<typeof derivedFills>;
  space: typeof space;
  screenGutter: number;
  radius: typeof radius;
  fonts: typeof fonts;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  lineHeight: typeof lineHeight;
  duration: typeof duration;
  shadow: typeof shadow;
  layout: typeof layout;
}

interface ThemeContextValue {
  theme: Theme;
  scheme: ColorScheme;
  /** Override the system scheme. Pass `null` to follow the OS again. */
  setScheme: (scheme: ColorScheme | null) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function buildTheme(scheme: ColorScheme): Theme {
  const palette = palettes[scheme];
  return {
    scheme,
    colors: { ...palette, ...derivedFills(palette) },
    space,
    screenGutter,
    radius,
    fonts,
    fontSize,
    fontWeight,
    lineHeight,
    duration,
    shadow,
    layout,
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [override, setOverride] = useState<ColorScheme | null>(null);

  // Default to Dark unless the OS explicitly asks for Light (DESIGN.md: Dark default).
  const scheme: ColorScheme = override ?? (systemScheme === 'light' ? 'light' : 'dark');
  const theme = useMemo(() => buildTheme(scheme), [scheme]);

  const value = useMemo(
    () => ({ theme, scheme, setScheme: setOverride }),
    [theme, scheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx.theme;
}

export function useThemeControls() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeControls must be used within <ThemeProvider>');
  return { scheme: ctx.scheme, setScheme: ctx.setScheme };
}
