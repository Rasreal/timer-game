import { SHOW_DEV_TOOLS, colors, font, radius } from '../../src/theme';

const HEX = /^#[0-9A-Fa-f]{6}$/;

const EXPECTED_KEYS = [
  'orange',
  'green',
  'bg',
  'surface',
  'surface2',
  'surface3',
  'graphite',
  'ring',
  'text',
  'textDim',
  'textMuted',
  'success',
  'red',
  'yellow',
  'gray',
] as const;

describe('theme colours', () => {
  it('exports every token the screens reference', () => {
    expect(Object.keys(colors).sort()).toEqual([...EXPECTED_KEYS].sort());
  });

  it.each(EXPECTED_KEYS)('%s is a valid 6-digit hex string', (key) => {
    const value = colors[key];
    expect(typeof value).toBe('string');
    expect(value).toMatch(HEX);
  });

  it.each([
    ['orange', '#FF8A25'],
    ['green', '#81D742'],
    ['bg', '#000000'],
    ['text', '#FFFFFF'],
    ['red', '#FF2222'],
    ['yellow', '#FFD900'],
    ['success', '#18A86B'],
    ['graphite', '#2B2B2B'],
    ['ring', '#2E2E2E'],
    ['gray', '#888888'],
  ] as const)('%s matches the spec value %s', (key, value) => {
    expect(colors[key]).toBe(value);
  });

  it('has no duplicate colour keys pointing at conflicting cases', () => {
    for (const value of Object.values(colors)) {
      // The spec writes every token in upper-case hex.
      expect(value).toBe(value.toUpperCase());
    }
  });

  it('keeps the background and the text colour maximally separated', () => {
    expect(colors.bg).toBe('#000000');
    expect(colors.text).toBe('#FFFFFF');
    expect(colors.bg).not.toBe(colors.text);
  });
});

describe('other theme tokens', () => {
  it('exports a numeric corner radius', () => {
    expect(typeof radius).toBe('number');
    expect(radius).toBe(11);
    expect(Number.isNaN(radius)).toBe(false);
  });

  it('exports the font shape with a system-face fallback', () => {
    expect(font).toHaveProperty('regular');
    // The prototype ships no font binary, so `regular` is deliberately
    // undefined and the platform's system face is used.
    expect(font.regular).toBeUndefined();
  });

  it('SHOW_DEV_TOOLS is a boolean, off unless EXPO_PUBLIC_SHOW_DEV_TOOLS === "1"', () => {
    expect(typeof SHOW_DEV_TOOLS).toBe('boolean');
    expect(SHOW_DEV_TOOLS).toBe(process.env.EXPO_PUBLIC_SHOW_DEV_TOOLS === '1');
  });

  it('SHOW_DEV_TOOLS is off by default in the test environment', () => {
    expect(SHOW_DEV_TOOLS).toBe(false);
  });
});
