import type { TextStyle, ViewStyle } from 'react-native';

// Single source of truth for the app's look. Mirrors the website's clean sans
// typography: near-black ink, neutral greys, hairline borders and black primary buttons.
// Light mode only (app.json userInterfaceStyle: light).

export const colors = {
  canvas: '#F5F5F7', // matches the splash background
  surface: '#FFFFFF',
  surfaceMuted: '#F3F3F5',
  surfacePressed: '#EDEDF0',
  onDarkMuted: '#C7C7CC', // secondary text on black surfaces
  ink: '#111111',
  inkSecondary: '#4A4A4F', // body copy, ~8.6:1 on white
  muted: '#6B6B70', // captions, ~5.3:1 on white, ~4.9:1 on canvas (WCAG AA)
  placeholder: '#8A8A8F',
  line: '#E5E5EA',
  lineStrong: '#D1D1D6',
  white: '#FFFFFF',
  black: '#111111',
  accent: '#E2B112', // gold, only on dark surfaces
  accentInk: '#7A5B12', // gold readable on light surfaces
  accentSurface: '#FBF6E7',
  track: '#E9E9EC',
  success: '#1D7A46',
  successSurface: '#EAF6EF',
  successLine: '#9ED3B3',
  danger: '#B3261E',
  dangerSurface: '#FCEEEE',
  dangerLine: '#F0B4B0',
  info: '#2F4A6B',
  infoSurface: '#EEF2F7',
};

export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radii = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;

export const layout = {
  maxWidth: 600,
  gutter: 20,
  gutterCompact: 16, // iPhone SE / small Android widths
  compactBreakpoint: 380,
  minTouch: 44,
  controlHeight: 50,
} as const;

// Typography scale. Sizes respect Dynamic Type (allowFontScaling is on by default);
// large display sizes cap their scaling via `maxScale` to avoid clipping.
export const type = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -1, color: colors.ink },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.6, color: colors.ink },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '600', letterSpacing: -0.3, color: colors.ink },
  subheading: { fontSize: 17, lineHeight: 23, fontWeight: '600', letterSpacing: -0.2, color: colors.ink },
  body: { fontSize: 16, lineHeight: 23, color: colors.inkSecondary },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: '600', color: colors.ink },
  label: { fontSize: 14, lineHeight: 19, fontWeight: '600', color: colors.ink },
  caption: { fontSize: 13, lineHeight: 18, color: colors.muted },
  overline: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: colors.muted },
  stat: { fontSize: 36, lineHeight: 42, fontWeight: '700', letterSpacing: -1, color: colors.ink },
  button: { fontSize: 16, lineHeight: 21, fontWeight: '600' },
} satisfies Record<string, TextStyle>;

export const maxScale = { display: 1.4, title: 1.5, stat: 1.4 } as const;

export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  raised: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
} satisfies Record<string, ViewStyle>;

export const pressedOpacity = 0.7;
export const disabledOpacity = 0.45;
