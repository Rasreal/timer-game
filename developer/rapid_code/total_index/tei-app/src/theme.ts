/**
 * Design tokens taken verbatim from the PowerPoint spec
 * ("Suggested Tokens" + "Official / Implied Color Palette" slides).
 */
export const colors = {
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
} as const;

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
