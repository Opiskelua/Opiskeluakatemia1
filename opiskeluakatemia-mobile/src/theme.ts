import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, useColorScheme, type TextStyle, type ViewStyle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Single source of truth for the app's look: soft rounded cards, pill buttons and bold headings,
// in a light and a dark palette with the same token names. Screens read the active palette with
// useTheme() / makeStyles(); never import colours as constants.

export type ColorScheme = 'light' | 'dark';
export type ThemePreference = 'system' | ColorScheme;

const light = {
  canvas: '#F5F5F7', // matches the splash background
  surface: '#FFFFFF',
  surfaceMuted: '#F0F0F3',
  surfacePressed: '#E8E8EC',
  ink: '#111111',
  inkSecondary: '#4A4A4F', // body copy, ~8.6:1 on white
  muted: '#6B6B70', // captions, ~5.3:1 on white (WCAG AA)
  placeholder: '#8A8A8F',
  line: '#E5E5EA',
  lineStrong: '#D1D1D6',
  white: '#FFFFFF',
  black: '#111111',
  primary: '#111111', // primary pill buttons and selected chips
  onPrimary: '#FFFFFF',
  hero: '#111111', // emphasised cards (e.g. "continue learning")
  onHero: '#FFFFFF',
  onHeroMuted: '#C7C7CC',
  heroTrack: '#3A3A3C',
  accent: '#E2B112', // gold, only on hero surfaces
  accentInk: '#7A5B12', // gold readable on light surfaces
  accentSurface: '#FBF6E7',
  track: '#E6E6EA',
  success: '#1D7A46',
  successSurface: '#EAF6EF',
  successLine: '#9ED3B3',
  danger: '#B3261E',
  dangerSurface: '#FCEEEE',
  dangerLine: '#F0B4B0',
  info: '#2F4A6B',
  infoSurface: '#EEF2F7',
};

export type Colors = typeof light;

const dark: Colors = {
  canvas: '#161616',
  surface: '#242424',
  surfaceMuted: '#323235', // must stay distinguishable from surface (inset boxes, secondary buttons)
  surfacePressed: '#3A3A3D',
  ink: '#F5F5F5',
  inkSecondary: '#C7C7CC', // ~10:1 on surface
  muted: '#9A9AA0', // ~5.6:1 on surface
  placeholder: '#7C7C82',
  line: '#2F2F32',
  lineStrong: '#3A3A3D',
  white: '#FFFFFF',
  black: '#111111',
  primary: '#F5F5F5', // white pill buttons on dark, as in the reference design
  onPrimary: '#111111',
  hero: '#242424',
  onHero: '#F5F5F5',
  onHeroMuted: '#B4B4BA',
  heroTrack: '#3A3A3D',
  accent: '#E8BE2E',
  accentInk: '#E8BE2E',
  accentSurface: '#3A3220',
  track: '#3A3A3D',
  success: '#5BD38A',
  successSurface: '#1E3227',
  successLine: '#2E5A40',
  danger: '#FF8A80',
  dangerSurface: '#3A2222',
  dangerLine: '#5C3333',
  info: '#A9C1E0',
  infoSurface: '#22293A',
};

export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radii = { sm: 10, md: 14, lg: 20, xl: 24, pill: 999 } as const;

export const layout = {
  maxWidth: 600,
  gutter: 20,
  gutterCompact: 16, // iPhone SE / small Android widths
  compactBreakpoint: 380,
  minTouch: 44,
  controlHeight: 52,
} as const;

// Typography scale. Sizes respect Dynamic Type (allowFontScaling is on by default);
// large display sizes cap their scaling via `maxScale` to avoid clipping.
function typeScale(c: Colors) {
  return {
    display: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -1, color: c.ink },
    title: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.6, color: c.ink },
    heading: { fontSize: 21, lineHeight: 27, fontWeight: '700', letterSpacing: -0.3, color: c.ink },
    subheading: { fontSize: 17, lineHeight: 23, fontWeight: '600', letterSpacing: -0.2, color: c.ink },
    body: { fontSize: 16, lineHeight: 23, color: c.inkSecondary },
    bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: '600', color: c.ink },
    label: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: c.ink },
    caption: { fontSize: 13, lineHeight: 18, color: c.muted },
    overline: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: c.muted },
    stat: { fontSize: 36, lineHeight: 42, fontWeight: '700', letterSpacing: -1, color: c.ink },
    button: { fontSize: 16, lineHeight: 21, fontWeight: '600' },
  } satisfies Record<string, TextStyle>;
}

function shadows(scheme: ColorScheme) {
  // Dark mode separates surfaces by colour; shadows would be invisible or muddy.
  const none = { shadowOpacity: 0, elevation: 0 };
  return {
    card: scheme === 'dark' ? none : { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 1 },
    raised: scheme === 'dark' ? none : { shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 4 },
  } satisfies Record<string, ViewStyle>;
}

export const maxScale = { display: 1.4, title: 1.5, stat: 1.4 } as const;
export const pressedOpacity = 0.7;
export const disabledOpacity = 0.45;

export interface Theme {
  scheme: ColorScheme;
  colors: Colors;
  type: ReturnType<typeof typeScale>;
  shadow: ReturnType<typeof shadows>;
}

function buildTheme(scheme: ColorScheme): Theme {
  const colors = scheme === 'dark' ? dark : light;
  return { scheme, colors, type: typeScale(colors), shadow: shadows(scheme) };
}
const themes: Record<ColorScheme, Theme> = { light: buildTheme('light'), dark: buildTheme('dark') };

const STORAGE_KEY = 'oa-theme-preference';
interface ThemeContextValue extends Theme { preference: ThemePreference; setPreference: (value: ThemePreference) => void }
const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Holds the System / Light / Dark choice (remembered on the device) and the active palette. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const system = useColorScheme();
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(value => {
      if (value === 'light' || value === 'dark' || value === 'system') setPreferenceState(value);
    }).catch(() => undefined);
  }, []);
  // Native UI (alerts, keyboard, date pickers) follows the chosen theme too.
  useEffect(() => { Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference); }, [preference]);
  const setPreference = useCallback((value: ThemePreference) => {
    setPreferenceState(value);
    AsyncStorage.setItem(STORAGE_KEY, value).catch(() => undefined);
  }, []);
  const scheme: ColorScheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  const value = useMemo(() => ({ ...themes[scheme], preference, setPreference }), [scheme, preference, setPreference]);
  return createElement(ThemeContext.Provider, { value }, children);
}

const noop = () => undefined;
export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  const system = useColorScheme();
  // The root error boundary renders in place of the layout, outside the provider: follow the system there.
  return value ?? { ...themes[system === 'dark' ? 'dark' : 'light'], preference: 'system', setPreference: noop };
}

/** Theme-aware StyleSheet: `const useStyles = makeStyles(t => StyleSheet.create({...}))`, then `const s = useStyles()`. */
export function makeStyles<T>(factory: (theme: Theme) => T): () => T {
  const cache = new Map<ColorScheme, T>();
  return function useStyles() {
    const { scheme } = useTheme();
    let styles = cache.get(scheme);
    if (!styles) { styles = factory(themes[scheme]); cache.set(scheme, styles); }
    return styles;
  };
}
