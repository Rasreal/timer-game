import { act, screen } from '@testing-library/react-native';
import Home from '../app/home';
import Review from '../app/review';
import Plan from '../app/plan';
import Ranges from '../app/ranges';
import SessionType from '../app/session-type';
import Planner from '../app/planner';
import { useAuth } from '../src/auth';
import * as sessions from '../src/lib/sessions';
import * as plans from '../src/lib/plans';
import {
  ACCENTS,
  onAccentTint as tintOf,
  DEFAULT_ACCENT,
  accentAlpha,
  colors,
  lightTint,
  onAccentTint,
  setAccent,
} from '../src/theme';
import { makeAuth, makeProfile, makeSession, renderMain } from './helpers/mainRender';

jest.mock('../src/lib/supabase');
jest.mock('../src/lib/sessions');
jest.mock('../src/lib/plans', () => ({
  ...jest.requireActual('../src/lib/plans'),
  listPlansBetween: jest.fn(),
  savePlan: jest.fn(),
  clearPlan: jest.fn(),
}));
jest.mock('../src/auth');

const mockedAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedLatest = sessions.latestSession as jest.MockedFunction<
  typeof sessions.latestSession
>;
const listSessions = sessions.listSessionsBetween as jest.MockedFunction<
  typeof sessions.listSessionsBetween
>;
const listPlans = plans.listPlansBetween as jest.MockedFunction<
  typeof plans.listPlansBetween
>;

/** A Premium swatch that is unmistakably not the brand orange. */
const PURPLE = '#7E28BD';

function flatten(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>(
      (acc, s) => ({ ...acc, ...flatten(s) }),
      {},
    );
  }
  if (!style || typeof style !== 'object') return {};
  return style as Record<string, unknown>;
}

function styleOf(node: { props: { style?: unknown } }): Record<string, unknown> {
  return flatten(node.props.style);
}

/**
 * Every colour-bearing style value in the rendered tree.
 *
 * The regression these tests guard is a colour that silently stays orange, so
 * the strongest assertion available is "the old accent appears nowhere".
 */
function allColourValues(): string[] {
  const out: string[] = [];
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const n = node as { props?: { style?: unknown }; children?: unknown[] };
    for (const [key, value] of Object.entries(styleOf(n as never))) {
      if (
        typeof value === 'string' &&
        /color/i.test(key) &&
        value.startsWith('#')
      ) {
        out.push(value.toUpperCase());
      }
    }
    for (const child of n.children ?? []) visit(child);
  };
  visit(screen.toJSON() as never);
  return out;
}

beforeEach(() => {
  setAccent(DEFAULT_ACCENT);
  mockedLatest.mockResolvedValue({ data: makeSession({ tei: 27 }), error: null });
  listSessions.mockResolvedValue({ data: [], error: null });
  listPlans.mockResolvedValue({ data: [], error: null });
  mockedAuth.mockReturnValue(
    makeAuth({ profile: makeProfile({ tier: 'premium' }) }) as never,
  );
});

afterEach(() => {
  // The accent is module-level state; leaving it purple would bleed into
  // every suite that renders after this one.
  setAccent(DEFAULT_ACCENT);
});

/* --------------------------------------------------------------------- */
/* The bug the user reported                                              */
/* --------------------------------------------------------------------- */

describe('Home tiles follow the chosen accent', () => {
  it('paints the tile background with the default accent', () => {
    renderMain(<Home />);

    expect(styleOf(screen.getByLabelText('Calculate Session')).backgroundColor)
      .toBe(DEFAULT_ACCENT);
  });

  it('repaints every unlocked tile when the accent changes', () => {
    renderMain(<Home />);

    act(() => setAccent(PURPLE, 'premium'));

    // All three unlocked tiles, not just the first — the frozen stylesheet
    // entry they shared was `tileActive`.
    for (const label of ['Calculate Session', 'Review', 'Plan TEI']) {
      expect(styleOf(screen.getByLabelText(label)).backgroundColor).toBe(PURPLE);
    }
  });

  it('leaves no trace of the old accent anywhere on Home', () => {
    renderMain(<Home />);
    act(() => setAccent(PURPLE, 'premium'));

    expect(allColourValues()).not.toContain(DEFAULT_ACCENT);
  });

  it('repaints the big last-session TEI score', async () => {
    renderMain(<Home />);
    await act(async () => {});

    act(() => setAccent(PURPLE, 'premium'));

    expect(styleOf(screen.getByText('27')).color).toBe(PURPLE);
  });

  it('does not tint the locked tiles with the accent', () => {
    mockedAuth.mockReturnValue(
      makeAuth({ profile: makeProfile({ tier: 'elemental' }) }) as never,
    );
    renderMain(<Home />);
    act(() => setAccent(PURPLE, 'premium'));

    // Locked tiles are deliberately dark grey, at any accent.
    expect(styleOf(screen.getByLabelText('Review')).backgroundColor)
      .toBe('#151515');
  });
});

/* --------------------------------------------------------------------- */
/* The other screens that had frozen references                           */
/* --------------------------------------------------------------------- */

describe('other previously-frozen accent sites', () => {
  it('repaints the Review month arrows', async () => {
    renderMain(<Review />);
    await act(async () => {});

    act(() => setAccent(PURPLE, 'premium'));

    expect(styleOf(screen.getByText('←')).color).toBe(PURPLE);
    expect(styleOf(screen.getByText('→')).color).toBe(PURPLE);
  });

  it('repaints the Plan month arrows', async () => {
    renderMain(<Plan />);
    await act(async () => {});

    act(() => setAccent(PURPLE, 'premium'));

    expect(styleOf(screen.getByText('←')).color).toBe(PURPLE);
    expect(styleOf(screen.getByText('→')).color).toBe(PURPLE);
  });

  it('repaints the Effective Ranges note', () => {
    renderMain(<Ranges />);

    act(() => setAccent(PURPLE, 'premium'));

    expect(allColourValues()).not.toContain(DEFAULT_ACCENT);
  });
});

/* --------------------------------------------------------------------- */
/* Re-render plumbing                                                     */
/* --------------------------------------------------------------------- */

describe('accent changes reach mounted screens', () => {
  it('repaints without any other state change forcing a re-render', () => {
    renderMain(<Home />);
    const before = styleOf(screen.getByLabelText('Profile')).backgroundColor;

    act(() => setAccent(PURPLE, 'premium'));

    // Nothing was navigated, tapped or re-fetched between the two reads.
    expect(before).toBe(DEFAULT_ACCENT);
    expect(styleOf(screen.getByLabelText('Profile')).backgroundColor).toBe(PURPLE);
  });

  it('falls back to the brand orange when the tier may not pick a colour', () => {
    renderMain(<Home />);

    // Elemental has no accent entitlement, so the swatch is refused.
    act(() => setAccent(PURPLE, 'elemental'));

    expect(styleOf(screen.getByLabelText('Profile')).backgroundColor)
      .toBe(DEFAULT_ACCENT);
  });

  it('restores the brand orange on sign-out', () => {
    renderMain(<Home />);
    act(() => setAccent(PURPLE, 'premium'));
    act(() => setAccent(null));

    expect(styleOf(screen.getByLabelText('Profile')).backgroundColor)
      .toBe(DEFAULT_ACCENT);
  });

  it('keeps colors.orange in step for the inline call sites', () => {
    setAccent(PURPLE, 'premium');
    expect(colors.orange).toBe(PURPLE);
  });
});

/* --------------------------------------------------------------------- */
/* The white screens' lighter tint                                        */
/* --------------------------------------------------------------------- */

describe('lightTint', () => {
  it("reproduces the designer's #F5B078 for the brand orange", () => {
    // Within one step per channel of the hand-picked swatch.
    const tint = lightTint(DEFAULT_ACCENT);
    const channels = [1, 3, 5].map((i) => parseInt(tint.slice(i, i + 2), 16));
    for (const [i, target] of [0xf5, 0xb0, 0x78].entries()) {
      expect(Math.abs(channels[i] - target)).toBeLessThanOrEqual(2);
    }
  });

  it('tracks the chosen accent rather than staying orange', () => {
    expect(lightTint(PURPLE)).not.toBe(lightTint(DEFAULT_ACCENT));
  });

  it('always returns a lighter colour than its input', () => {
    const luma = (hex: string) =>
      [1, 3, 5]
        .map((i) => parseInt(hex.slice(i, i + 2), 16))
        .reduce((a, b) => a + b, 0);

    for (const accent of [DEFAULT_ACCENT, PURPLE, '#0030FF', '#FF2122', '#24AD77']) {
      expect(luma(lightTint(accent))).toBeGreaterThan(luma(accent));
    }
  });

  it('stays a valid 6-digit upper-case hex for every swatch', () => {
    for (const accent of [DEFAULT_ACCENT, PURPLE, '#01FFFF', '#FFCF00', '#000000']) {
      expect(lightTint(accent)).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it("falls back to the designer's tint for an unparseable value", () => {
    expect(lightTint('not-a-colour')).toBe('#F5B078');
  });
});

/* --------------------------------------------------------------------- */
/* The on-accent tint, for the accent-coloured backgrounds                */
/* --------------------------------------------------------------------- */

function rgbOf(hex: string): [number, number, number] {
  const i = parseInt(hex.slice(1), 16);
  return [(i >> 16) & 0xff, (i >> 8) & 0xff, i & 0xff];
}

function luminance(hex: string): number {
  const lin = (c: number) => {
    const n = c / 255;
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = rgbOf(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

describe('onAccentTint', () => {
  it('stays legible on EVERY swatch, including the extremes', () => {
    // Purple and Blue are so dark that no darker tint can work; Yellow and
    // Cyan are so light that a fixed darkening would be overkill. Both ends
    // must still clear the contrast floor.
    for (const { value, name } of ACCENTS) {
      const ratio = contrastRatio(onAccentTint(value), value);
      expect({ name, ratio: Number(ratio.toFixed(2)) }).toEqual({
        name,
        ratio: expect.any(Number),
      });
      expect(ratio).toBeGreaterThanOrEqual(2.99);
    }
  });

  it('is a darker shade for the bright accents', () => {
    for (const accent of ['#FF8A25', '#FFCF00', '#01FFFF', '#81D742']) {
      expect(luminance(onAccentTint(accent))).toBeLessThan(luminance(accent));
    }
  });

  it('goes LIGHTER for the two accents too dark to darken', () => {
    // Against #0030FF and #7E28BD even pure black only reaches ~2.9:1, so a
    // darker tint could never be legible — the tint must invert.
    for (const accent of ['#0030FF', '#7E28BD']) {
      expect(luminance(onAccentTint(accent))).toBeGreaterThan(luminance(accent));
    }
  });

  it("stays close to the designer's #7A4A12 for the brand orange", () => {
    // Same hue family, still a dark brown rather than collapsing to black.
    const tint = onAccentTint(DEFAULT_ACCENT);
    expect(tint).not.toBe('#000000');
    const [r, g, b] = rgbOf(tint);
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(b);
  });

  it('tracks the accent rather than staying orange', () => {
    expect(onAccentTint('#7E28BD')).not.toBe(onAccentTint(DEFAULT_ACCENT));
  });

  it('falls back to the designer value for an unparseable input', () => {
    expect(onAccentTint('nope')).toBe('#7A4A12');
  });
});

describe('accentAlpha', () => {
  it('builds the press wash from the current accent', () => {
    expect(accentAlpha('#7E28BD', 0.16)).toBe('rgba(126,40,189,0.16)');
  });

  it('reproduces the original hard-coded orange wash', () => {
    expect(accentAlpha(DEFAULT_ACCENT, 0.16)).toBe('rgba(255,138,37,0.16)');
  });
});

/* --------------------------------------------------------------------- */
/* The accent-background screens must not hard-code an on-accent tint     */
/* --------------------------------------------------------------------- */

describe('screens painted with the accent', () => {
  /** Every colour string anywhere in the tree, style props and colour props. */
  function allColoursDeep(): string[] {
    const out: string[] = [];
    const visit = (node: unknown): void => {
      if (!node || typeof node !== 'object') return;
      const n = node as {
        props?: Record<string, unknown>;
        children?: unknown[];
      };
      for (const [key, value] of Object.entries(n.props ?? {})) {
        if (typeof value === 'string' && value.startsWith('#')) {
          out.push(value.toUpperCase());
        }
        if (key === 'style') {
          for (const v of Object.values(flatten(value))) {
            if (typeof v === 'string' && v.startsWith('#')) out.push(v.toUpperCase());
          }
        }
      }
      for (const child of n.children ?? []) visit(child);
    };
    visit(screen.toJSON() as never);
    return out;
  }

  // #7A4A12 is the brand orange's on-accent tint. Under any other accent it
  // is a stray orange-brown, so it must never appear as a literal.
  const ORANGE_ON_ACCENT = '#7A4A12';

  it('Session Type uses the derived tint, not the hard-coded #7A4A12', () => {
    renderMain(<SessionType />);
    act(() => setAccent(PURPLE, 'premium'));

    const colours = allColoursDeep();
    expect(colours).not.toContain(ORANGE_ON_ACCENT);
    expect(colours).toContain(tintOf(PURPLE));
  });

  it('the 7-Day Planner uses the derived tint too', () => {
    renderMain(<Planner />);
    act(() => setAccent(PURPLE, 'premium'));

    const colours = allColoursDeep();
    expect(colours).not.toContain(ORANGE_ON_ACCENT);
    expect(colours).toContain(tintOf(PURPLE));
  });

  it('paints the Planner background with the accent itself', () => {
    renderMain(<Planner />);
    act(() => setAccent(PURPLE, 'premium'));

    expect(allColoursDeep()).toContain(PURPLE);
  });
});
