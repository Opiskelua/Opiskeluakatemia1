import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, useColorScheme, type TextStyle, type ViewStyle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Single source of truth for the app's look: neutral "smoky glass" (visionOS / iOS 26 Liquid Glass),
// soft rounded cards, pill buttons and bold headings, in a light and a dark palette with the same
// token names. Screens read the active palette with useTheme() / makeStyles(); never import colours
// as constants.
//
// Glass rules: real blur / Liquid Glass (components/Glass.tsx) only on chrome and floating surfaces.
// Cards in scrolling content use the faux-glass `glass.card` style (an opaque card colour precomputed
// from white-over-canvas, a 1px hairline edge with a lighter top highlight and a soft shadow), so
// lists stay cheap and text always sits on a solid, high-contrast surface. Contrast ratios below are
// WCAG 2.x, measured against the opaque colours.

export type ColorScheme = 'light' | 'dark';
export type ThemePreference = 'system' | ColorScheme;

const light = {
  canvas: '#F2F1EE', // warm-neutral ambient canvas; matches the splash background (app.json)
  surface: '#FFFFFF',
  surfaceMuted: '#F0F0F3',
  surfacePressed: '#E8E8EC',
  ink: '#111111',
  inkSecondary: '#4A4A4F', // body copy, ~8.6:1 on white
  muted: '#6B6B70', // captions, ~5.3:1 on white, 5.1:1 on cardGlass, 4.7:1 on canvas (WCAG AA)
  placeholder: '#6E6E73', // ~5:1 on white, so hint text in empty fields stays readable
  line: '#E5E5EA',
  lineStrong: '#D1D1D6',
  control: '#86868B', // input and radio outlines, >=3:1 on surface and canvas (3.2:1) (WCAG 1.4.11)
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
  // Glass. cardGlass = white at 72% over canvas, stored opaque so shadows don't bleed through and
  // Android elevation renders cleanly; ink 18.2:1, inkSecondary 8.5:1, muted 5.1:1, control 3.5:1 on it.
  cardGlass: '#FBFBFA',
  glassEdge: 'rgba(17,17,17,0.08)', // 1px outer hairline of glass surfaces
  glassHighlight: '#FFFFFF', // lighter top edge (light catching the rim)
  glassTint: 'rgba(255,255,255,0.35)', // tint on real glass chrome (GlassView tintColor / over BlurView)
  glassSolid: '#FAFAF9', // what glass becomes on Android and with Reduce transparency (ink 18.1:1)
  // Smoky graphite hero glass: 84% scrim of #111 over the glass. Worst case (pure white behind):
  // #373737, onHero 11.9:1, onHeroMuted 7.1:1, accent 6.0:1.
  heroGlass: 'rgba(17,17,17,0.84)',
  heroGlassPressed: 'rgba(17,17,17,0.94)',
};

export type Colors = typeof light;

const dark: Colors = {
  canvas: '#141413', // warm-neutral near-black, matches the dark splash; ink 16.9:1, muted 6.6:1
  surface: '#242424',
  surfaceMuted: '#323235', // must stay distinguishable from surface (inset boxes, secondary buttons)
  surfacePressed: '#3A3A3D',
  ink: '#F5F5F5',
  inkSecondary: '#C7C7CC', // ~10:1 on surface
  muted: '#9A9AA0', // ~5.6:1 on surface, 5.4:1 on cardGlass
  placeholder: '#8E8E93', // ~4.8:1 on surface, 4.65:1 on cardGlass
  line: '#2F2F32',
  lineStrong: '#3A3A3D',
  control: '#7C7C82', // input and radio outlines, >=3:1 on surface, canvas, cardGlass (3.65:1) and surfaceMuted
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
  cardGlass: '#262625', // white at 7.5% over canvas, opaque; ink 13.9:1, inkSecondary 9:1, muted 5.4:1
  glassEdge: 'rgba(255,255,255,0.08)',
  glassHighlight: 'rgba(255,255,255,0.16)',
  glassTint: 'rgba(30,30,30,0.35)',
  glassSolid: '#222221', // ink 14.6:1
  // #2C2C2E at 88% over the dark canvas: onHero 13.5:1, onHeroMuted 7.1:1, accent 8.3:1.
  heroGlass: 'rgba(44,44,46,0.88)',
  heroGlassPressed: 'rgba(58,58,60,0.94)',
};

export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radii = { sm: 10, md: 14, lg: 20, xl: 26, pill: 999 } as const;

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
  // Dark mode separates surfaces by colour and the glass rim; shadows would be invisible or muddy.
  const none = { shadowOpacity: 0, elevation: 0 };
  return {
    card: scheme === 'dark' ? none : { shadowColor: '#1A1814', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 18, elevation: 1 },
    raised: scheme === 'dark' ? none : { shadowColor: '#1A1814', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.1, shadowRadius: 30, elevation: 4 },
  } satisfies Record<string, ViewStyle>;
}

/** Faux-glass styles for content (no blur): translucent-looking card, 1px rim with a lighter top edge, soft shadow. */
function glassStyles(c: Colors, shadow: ReturnType<typeof shadows>) {
  const rim = { borderWidth: 1, borderColor: c.glassEdge, borderTopColor: c.glassHighlight };
  return {
    rim,
    card: { backgroundColor: c.cardGlass, ...rim, ...shadow.card },
    /** Pill controls (secondary buttons, chips): muted fill with the same rim. */
    control: { backgroundColor: c.surfaceMuted, borderWidth: 1, borderColor: c.glassEdge },
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
  glass: ReturnType<typeof glassStyles>;
}

function buildTheme(scheme: ColorScheme): Theme {
  const colors = scheme === 'dark' ? dark : light;
  const shadow = shadows(scheme);
  return { scheme, colors, type: typeScale(colors), shadow, glass: glassStyles(colors, shadow) };
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
