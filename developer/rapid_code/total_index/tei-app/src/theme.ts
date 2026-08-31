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
  colors.orange =
    value && isAccentAllowed(value, tier) ? value : DEFAULT_ACCENT;
}
