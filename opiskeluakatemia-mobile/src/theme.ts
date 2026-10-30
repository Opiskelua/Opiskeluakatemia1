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
// from white-over-canvas, a static top sheen gradient, a 1px bright rim with a brighter top edge and a
// soft shadow) over the static ambient canvas, so lists stay cheap and text always sits on a solid,
// high-contrast surface. Exercise question / answer surfaces stay solid (`surface`). Contrast ratios
// below are WCAG 2.x, measured against the opaque colours (and the worst ambient pixel for canvas text).

export type ColorScheme = 'light' | 'dark';
export type ThemePreference = 'system' | ColorScheme;

// Ambient canvas (Screen.tsx <Ambient />): a static warm vertical gradient with soft taupe and slate
// glows and one light bloom, drawn once behind each screen with the native `backgroundImage` style
// (React Native 0.88 CSS gradients, no blur, no extra package). The glows sit at the screen edges and
// fade out before the top edge, so the solid stack header (canvas colour) meets the gradient without
// a seam. Text contrast is checked against the darkest (light) / lightest (dark) ambient pixel.
const ambientGlows = (taupe: number, slate: number, bloom: number) => [
  `radial-gradient(circle 230px at 88% 24%, rgba(255,255,255,${bloom}) 0%, rgba(255,255,255,0) 100%)`,
  `radial-gradient(circle 360px at 100% 62%, rgba(160,170,184,${slate}) 0%, rgba(160,170,184,0) 100%)`,
  `radial-gradient(circle 360px at 0% 36%, rgba(196,182,164,${taupe}) 0%, rgba(196,182,164,0) 100%)`,
].join(', ');

const light = {
  canvas: '#E7E3DD', // warm grey-beige; top of the ambient gradient, stack header and splash (app.json)
  // Ambient: canvas -> #DAD6D0 with the glows; darkest pixel #CCCCCC (slate glow centre at the right edge).
  ambient: `${ambientGlows(0.42, 0.3, 0.5)}, linear-gradient(180deg, #E7E3DD 0%, #DAD6D0 100%)`,
  surface: '#FFFFFF', // solid answer / input surfaces
  surfaceMuted: '#ECE9E4', // secondary pills, badges; slightly darker than cardGlass, lighter than canvas
  surfacePressed: '#E3DFD9',
  ink: '#111111', // 17.2:1 on cardGlass, 14.8:1 on canvas, 11.7:1 on the darkest ambient pixel
  inkSecondary: '#4A4A4F', // body copy, 8.0:1 on cardGlass, 6.9:1 on canvas, 5.4:1 darkest ambient
  muted: '#585652', // captions, 6.7:1 on cardGlass, 6.1:1 on surfaceMuted, 5.7:1 on canvas, 4.6:1 darkest ambient (WCAG AA)
  placeholder: '#5F5D59', // hint text in fields, 6.6:1 on white, 6.0:1 on cardGlass, 5.1:1 on canvas
  line: '#DFDBD5',
  lineStrong: '#CBC7C0',
  control: '#6F6C66', // input and radio outlines, 4.8:1 on cardGlass, 4.1:1 on canvas, 3.3:1 darkest ambient (WCAG 1.4.11)
  white: '#FFFFFF',
  black: '#111111',
  primary: '#111111', // primary pill buttons and selected chips
  onPrimary: '#FFFFFF',
  hero: '#1C1B19', // emphasised cards (e.g. "continue learning"), warm charcoal
  onHero: '#FFFFFF', // 17.2:1 on hero
  onHeroMuted: '#C7C7CC', // 10.2:1 on hero
  heroTrack: '#3D3B38',
  accent: '#E2B112', // gold, only on hero surfaces (8.6:1 on hero)
  accentInk: '#6B4F0F', // gold readable on light surfaces: 6.9:1 on cardGlass, 6.0:1 canvas, 4.8:1 darkest ambient
  accentSurface: '#FBF6E7',
  track: '#E2DED8',
  success: '#17663A', // 6.4:1 on cardGlass, 5.5:1 on canvas, 4.4:1 at the darkest ambient edge pixel
  successSurface: '#EAF6EF',
  successLine: '#9ED3B3',
  danger: '#A8231C', // 6.6:1 on cardGlass, 5.6:1 on canvas, 4.5:1 darkest ambient
  dangerSurface: '#FCEEEE',
  dangerLine: '#F0B4B0',
  info: '#2F4A6B',
  infoSurface: '#EEF2F7',
  // Glass. cardGlass is white at ~62% over the canvas, stored opaque so shadows don't bleed through and
  // Android elevation renders cleanly. `cardSheen` (white .7 -> 0 over the top half) lays a lighter
  // glass sheen on top; contrast is measured on the plain cardGlass (the darker, worst case).
  cardGlass: '#F6F4F1',
  cardSheen: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 55%)',
  glassEdge: 'rgba(255,255,255,0.8)', // 1px bright rim of glass surfaces (the card edge comes from the shadow)
  glassHighlight: '#FFFFFF', // brightest top edge (light catching the rim)
  glassShadow: '#3C3228', // warm soft shadow
  glassTint: 'rgba(255,255,255,0.35)', // tint on real glass chrome (GlassView tintColor / over BlurView)
  glassSolid: '#F7F5F2', // what glass becomes on Android and with Reduce transparency (ink 17.4:1)
  // Smoky graphite hero glass: 84% scrim of the hero colour over the glass. Worst case (pure white
  // behind): onHero 10.5:1, onHeroMuted 6.2:1, accent 5.3:1.
  heroGlass: 'rgba(28,27,25,0.84)',
  heroGlassPressed: 'rgba(28,27,25,0.94)',
};

export type Colors = typeof light;

const dark: Colors = {
  canvas: '#1A1918', // deep warm charcoal; top of the ambient, header and dark splash
  // Ambient: canvas -> #0E0E0F with faint glows; lightest pixel #272523 (taupe glow at the left edge).
  ambient: `${ambientGlows(0.1, 0.09, 0.035)}, linear-gradient(180deg, #1A1918 0%, #0E0E0F 100%)`,
  surface: '#2A2927', // inputs and solid answer surfaces
  surfaceMuted: '#363431', // must stay distinguishable from surface (inset boxes, secondary buttons)
  surfacePressed: '#403E3B',
  ink: '#F5F5F5', // 13.7:1 on cardGlass, 11.4:1 at the top of the card sheen, 14.0:1 lightest ambient
  inkSecondary: '#C7C7CC', // 8.9:1 on cardGlass, 7.4:1 on surfaceMuted
  muted: '#A3A2A7', // 5.9:1 on cardGlass, 4.9:1 on the card sheen top and surfaceMuted, 6.0:1 lightest ambient
  placeholder: '#A09FA5', // 5.5:1 on surface, 4.7:1 on surfaceMuted (path answer inputs)
  line: '#34322F',
  lineStrong: '#44423E',
  control: '#86847F', // input and radio outlines, 4.0:1 on cardGlass, 3.9:1 surface, 3.3:1 surfaceMuted, 4.1:1 lightest ambient
  white: '#FFFFFF',
  black: '#111111',
  primary: '#F5F5F5', // white pill buttons on dark, as in the reference design
  onPrimary: '#111111',
  hero: '#373532', // lifted smoky graphite, clearly above cardGlass
  onHero: '#F5F5F5', // 11.2:1 on hero
  onHeroMuted: '#B9B8BE', // 6.2:1 on hero
  heroTrack: '#55524E',
  accent: '#E8BE2E', // 6.9:1 on hero
  accentInk: '#E8BE2E', // 8.4:1 on cardGlass
  accentSurface: '#3A3220',
  track: '#403E3B',
  success: '#5BD38A', // 7.9:1 on cardGlass
  successSurface: '#1E3227',
  successLine: '#2E5A40',
  danger: '#FF8A80', // 6.5:1 on cardGlass
  dangerSurface: '#3A2222',
  dangerLine: '#5C3333',
  info: '#A9C1E0',
  infoSurface: '#22293A',
  cardGlass: '#282725', // white at ~8% over the canvas, opaque (smoky charcoal glass)
  cardSheen: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 60%)',
  glassEdge: 'rgba(255,255,255,0.10)',
  glassHighlight: 'rgba(255,255,255,0.22)', // lit top rim separates cards from the dark canvas
  glassShadow: '#000000',
  glassTint: 'rgba(36,34,32,0.35)',
  glassSolid: '#252422', // ink 14.2:1
  // Hero colour at 88% over the dark canvas or cards: onHero 10.7:1, onHeroMuted 5.9:1, accent 6.6:1.
  heroGlass: 'rgba(58,56,53,0.88)',
  heroGlassPressed: 'rgba(72,70,66,0.94)',
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

function shadows(c: Colors, scheme: ColorScheme) {
  // Light: warm soft drop shadow. Dark: a faint deep shadow (iOS) on top of the lit rim; no Android
  // elevation in dark mode, where it only renders as a muddy grey halo.
  if (scheme === 'dark') return {
    card: { shadowColor: c.glassShadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 18, elevation: 0 },
    raised: { shadowColor: c.glassShadow, shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.5, shadowRadius: 30, elevation: 0 },
  } satisfies Record<string, ViewStyle>;
  return {
    card: { shadowColor: c.glassShadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.13, shadowRadius: 22, elevation: 2 },
    raised: { shadowColor: c.glassShadow, shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.2, shadowRadius: 32, elevation: 6 },
  } satisfies Record<string, ViewStyle>;
}

/** Faux-glass styles for content (no blur): opaque card with a lighter top sheen, 1px bright rim with a brighter top edge, soft shadow. */
function glassStyles(c: Colors, shadow: ReturnType<typeof shadows>) {
  const rim = { borderWidth: 1, borderColor: c.glassEdge, borderTopColor: c.glassHighlight };
  return {
    rim,
    card: { backgroundColor: c.cardGlass, backgroundImage: c.cardSheen, ...rim, ...shadow.card },
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
  const shadow = shadows(colors, scheme);
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
