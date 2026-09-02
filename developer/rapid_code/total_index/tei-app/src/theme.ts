import { useSyncExternalStore } from 'react';

/**
 * Design tokens taken verbatim from the PowerPoint spec
 * ("Suggested Tokens" + "Official / Implied Color Palette" slides).
 */
export const colors = {
  /**
   * The app accent. Mutable on purpose: `setAccent()` rewrites it when the
   * signed-in user's saved `accent_color` loads, and almost every reference
   * reads `colors.orange` inline during render, so the new value propagates
   * on the next paint without threading a prop through every screen.
   *
   * Named `orange` for its default rather than renamed to `accent`, so the
   * 70-odd existing call sites keep working untouched.
   */
  orange: '#FF8A25',
  green: '#81D742',
  bg: '#000000',
  surface: '#111111',
  surface2: '#1C1C1C',
  surface3: '#222222',
  graphite: '#2B2B2B',
  ring: '#2E2E2E',
  text: '#FFFFFF',
  textDim: '#DEDEDE',
  textMuted: '#8A8A8A',
  success: '#18A86B',
  red: '#FF2222',
  yellow: '#FFD900',
  gray: '#888888',
};

export const radius = 11;

/**
 * Developer affordances that are NOT in the client's mock-ups — the TEI
 * formula breakdown, the Sign Out link, "Forgot password?". They are useful
 * while building and reviewing, but they should be off for a client
 * walkthrough so the screens match the deck 1:1.
 *
 * Flip to true (or set EXPO_PUBLIC_SHOW_DEV_TOOLS=1) to bring them back.
 */
export const SHOW_DEV_TOOLS =
  process.env.EXPO_PUBLIC_SHOW_DEV_TOOLS === '1';

/**
 * The spec calls for a bold geometric sans. System faces are the closest
 * match available without shipping a font binary into the prototype:
 * SF Pro on iOS, Roboto on Android.
 */
export const font = {
  regular: undefined as string | undefined,
};

/* --------------------------------------------------------------------- */
/* Accent colour                                                          */
/* --------------------------------------------------------------------- */

export const DEFAULT_ACCENT = '#FF8A25';

/**
 * The accent swatches offered on Edit Profile, in mock-up order.
 *
 * Values sampled directly from the client's mock-up JPEGs, so they match the
 * design docs rather than being eyeballed.
 *
 * Premium sees all eleven — the orange, then green/blue/purple/red/yellow on
 * the first row and lime/cyan/violet/pink/gold on the second. Basic sees two
 * (see BASIC_ACCENTS below).
 */
export const ACCENTS: readonly { value: string; name: string }[] = [
  { value: DEFAULT_ACCENT, name: 'Orange' },
  { value: '#24AD77', name: 'Green' },
  { value: '#0030FF', name: 'Blue' },
  { value: '#7E28BD', name: 'Purple' },
  { value: '#FF2122', name: 'Red' },
  { value: '#FFCF00', name: 'Yellow' },
  { value: '#81D742', name: 'Lime' },
  { value: '#01FFFF', name: 'Cyan' },
  { value: '#AA4ED7', name: 'Violet' },
  { value: '#FF46A3', name: 'Pink' },
  { value: '#D5B02B', name: 'Gold' },
];

/**
 * Basic offers only two: the default orange and the same bright green the
 * Premium grid calls Lime. Sampled from the Basic mock-up, its swatch is
 * #81D742 — the Lime chip, NOT the deeper green in Premium's first row.
 */
const BASIC_ACCENTS = ACCENTS.filter(
  (a) => a.value === DEFAULT_ACCENT || a.name === 'Lime',
);

/** Which swatches a tier may choose from. Elemental gets none. */
export function accentsForTier(tier: string | undefined): typeof ACCENTS {
  if (tier === 'premium') return ACCENTS;
  if (tier === 'basic') return BASIC_ACCENTS;
  return [];
}

/** True when `value` is one of the swatches this tier is allowed to pick. */
export function isAccentAllowed(value: string, tier: string | undefined): boolean {
  return accentsForTier(tier).some(
    (a) => a.value.toLowerCase() === value.toLowerCase(),
  );
}

/**
 * Apply the user's saved accent, or fall back to the default.
 *
 * Elemental has no accent choice, so its profile's stored value is ignored
 * and the brand orange is restored — that also resets the module-level
 * `colors` when a user signs out or a different user signs in.
 */
export function setAccent(value: string | null | undefined, tier?: string): void {
  const next = value && isAccentAllowed(value, tier) ? value : DEFAULT_ACCENT;
  if (next === colors.orange) return;
  colors.orange = next;
  for (const listener of listeners) listener();
}

/* --------------------------------------------------------------------- */
/* Making the accent reach the screens                                    */
/* --------------------------------------------------------------------- */

/**
 * `setAccent()` mutates a module-level object, which React cannot see. Two
 * things follow from that, and both are fixed here:
 *
 *  1. Nothing re-renders when the accent changes, so a screen that is already
 *     mounted keeps painting the old colour until something unrelated happens
 *     to re-render it. `useAccent()` subscribes a component to the change.
 *  2. A `colors.orange` read inside `StyleSheet.create({...})` is evaluated
 *     once at module load and frozen forever. Those reads have been moved out
 *     into inline styles at their call sites so they are re-read per render.
 */
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getAccent(): string {
  return colors.orange;
}

/**
 * The current accent, as React state.
 *
 * Any component that paints the accent should read it through this hook
 * rather than touching `colors.orange` directly, so that picking a new
 * swatch on Edit Profile repaints it immediately.
 */
export function useAccent(): string {
  return useSyncExternalStore(subscribe, getAccent, getAccent);
}

/**
 * A lighter tint of the accent, for use on the app's two WHITE screens
 * (Edit Profile and Create Account), where the full-strength accent is too
 * dark and saturated to read as the same decorative element.
 *
 * The designer hand-picked #F5B078 as the orange's tint. Comparing it to the
 * brand #FF8A25 in HSL shows what they actually did: keep the hue, take a
 * little saturation off, and lift the lightness roughly a third of the way to
 * white. A plain mix-toward-white cannot reproduce it — the orange's red
 * channel is already 0xFF — so the same HSL move is applied here, which
 * reproduces the designer's swatch to within one step per channel (#F5B278)
 * and gives every other accent an equally legible tint on white.
 */
const TINT_SATURATION = 0.862;
const TINT_LIGHTEN = 0.335;

function hexToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, l]; // achromatic

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;

  return [h / 6, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number) => {
    const tt = (t + 1) % 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return [
    Math.round(channel(h + 1 / 3) * 255),
    Math.round(channel(h) * 255),
    Math.round(channel(h - 1 / 3) * 255),
  ];
}

export function lightTint(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  // Anything unparseable falls back to the designer's original tint rather
  // than crashing a render.
  if (!m) return '#F5B078';

  const int = parseInt(m[1], 16);
  const [h, s, l] = hexToHsl((int >> 16) & 0xff, (int >> 8) & 0xff, int & 0xff);
  const rgb = hslToRgb(h, s * TINT_SATURATION, l + (1 - l) * TINT_LIGHTEN);

  return `#${rgb
    .map((c) => c.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

/* --------------------------------------------------------------------- */
/* On-accent tint (for the accent-coloured backgrounds)                   */
/* --------------------------------------------------------------------- */

/**
 * Relative luminance, per WCAG, used to keep the on-accent tint legible.
 */
function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const n = c / 255;
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(
  a: [number, number, number],
  b: [number, number, number],
): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** The minimum contrast the on-accent tint must reach against the accent. */
const ON_ACCENT_MIN_CONTRAST = 3;

/**
 * A tint for elements drawn ON TOP OF an accent-coloured background — the
 * back arrows and rules on Session Type, the 7-Day Planner and the guided
 * entry screens, whose whole page is painted with the accent.
 *
 * The designer's value for the brand orange was #7A4A12: the same hue, a
 * little desaturated, and much darker. Simply reusing that darkening for
 * every swatch does not work, because it assumes a bright accent. Blue
 * (#0030FF) and Purple (#7E28BD) are so dark already that *even pure black*
 * only reaches ~2.9:1 against them — no darker tint can ever be legible
 * there. So the tint is chosen by search rather than by a fixed factor:
 * keep the accent's hue, walk the lightness axis, and take the first value
 * that clears 3:1 — preferring a DARKER tint (which is the intended look,
 * and what all nine bright swatches get, reproducing #7A4A12 for orange as
 * #784112) and falling back to a LIGHTER one only for the two accents where
 * darkening cannot work.
 */
export function onAccentTint(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  // Anything unparseable falls back to the designer's original tint.
  if (!m) return '#7A4A12';

  const int = parseInt(m[1], 16);
  const base: [number, number, number] = [
    (int >> 16) & 0xff,
    (int >> 8) & 0xff,
    int & 0xff,
  ];
  const [h, s, l] = hexToHsl(base[0], base[1], base[2]);
  const sat = Math.min(1, s * TINT_SATURATION);

  let darkest: [number, number, number] | null = null;
  let lightest: [number, number, number] | null = null;

  // Walk the lightness axis from the accent outwards. Scanning DOWN keeps the
  // last (i.e. lightest) value that still clears the floor, so the tint stays
  // a recognisable shade of the accent instead of collapsing to black — the
  // designer's #7A4A12 is a brown, not a void.
  for (let step = Math.round(l * 100); step >= 0; step--) {
    const rgb = hslToRgb(h, sat, step / 100) as [number, number, number];
    if (contrast(rgb, base) >= ON_ACCENT_MIN_CONTRAST) {
      darkest = rgb;
      break;
    }
  }
  if (darkest) {
    return `#${darkest
      .map((c) => c.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()}`;
  }

  // Blue and Purple land here: they are so dark that no darker tint can ever
  // reach the floor, so the tint goes lighter instead.
  for (let step = Math.round(l * 100); step <= 100; step++) {
    const rgb = hslToRgb(h, sat, step / 100) as [number, number, number];
    if (contrast(rgb, base) >= ON_ACCENT_MIN_CONTRAST) {
      lightest = rgb;
      break;
    }
  }

  const chosen = lightest ?? ([255, 255, 255] as [number, number, number]);
  return `#${chosen
    .map((c) => c.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

/**
 * The accent at a given opacity, for the translucent press-highlight washes.
 *
 * These were hard-coded as `rgba(255,138,37,0.16)` — the brand orange's exact
 * RGB — so they stayed orange under every other accent.
 */
export function accentAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return `rgba(255,138,37,${alpha})`;
  const int = parseInt(m[1], 16);
  return `rgba(${(int >> 16) & 0xff},${(int >> 8) & 0xff},${int & 0xff},${alpha})`;
}

/** The current accent's on-accent tint, as React state. */
export function useOnAccentTint(): string {
  return onAccentTint(useAccent());
}

/** The current accent's light-on-white tint, as React state. */
export function useAccentTint(): string {
  return lightTint(useAccent());
}
