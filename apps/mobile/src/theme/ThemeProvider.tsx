/**
 * Honeydo theme context. Resolves the active color scheme from the user's appearance
 * preference (`light` / `dark` / `system`, default Dark per DESIGN.md), persisted across
 * launches. Exposes the token set via `useTheme()` and the preference via
 * `useThemeControls()`. The Light/Dark swap stays a single switch — screens read
 * `theme.colors.*`, never raw hex.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import {
  type AppearancePreference,
  loadPreference,
  savePreference,
} from './preference';
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
  /** The user's appearance intent (`light` / `dark` / `system`). */
  preference: AppearancePreference;
  setPreference: (preference: AppearancePreference) => void;
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
  // Start at the default (Dark) so there's no light flash; swap when the stored value loads.
  const [preference, setPreferenceState] = useState<AppearancePreference>('dark');

  useEffect(() => {
    let active = true;
    void loadPreference().then((stored) => {
      if (active) setPreferenceState(stored);
    });
    return () => {
      active = false;
    };
  }, []);

  const setPreference = (next: AppearancePreference) => {
    setPreferenceState(next);
    savePreference(next);
  };

  // Resolve: `system` follows the OS; otherwise the explicit choice. Default Dark.
  const scheme: ColorScheme =
    preference === 'system'
      ? systemScheme === 'light'
        ? 'light'
        : 'dark'
      : preference;

  const theme = useMemo(() => buildTheme(scheme), [scheme]);

  // Paint the NATIVE root view behind React with the theme bg, so tab/screen
  // transitions never flash the default (white) window background.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.colors.bg);
  }, [theme.colors.bg]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, scheme, preference, setPreference }),
    [theme, scheme, preference],
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
  return {
    scheme: ctx.scheme,
    preference: ctx.preference,
    setPreference: ctx.setPreference,
  };
}
