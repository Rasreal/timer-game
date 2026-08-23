import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import Ranges from '../../app/ranges';
import { useAuth } from '../../src/auth';
import { EFFECTIVE_RANGES } from '../../src/lib/tei';
import { colors } from '../../src/theme';
import { makeAuth, makeProfile, renderMain } from '../helpers/mainRender';

jest.mock('../../src/lib/supabase');
jest.mock('../../src/lib/sessions');
jest.mock('../../src/lib/plans');
jest.mock('../../src/auth');

const mockedAuth = useAuth as jest.MockedFunction<typeof useAuth>;

function signedIn(over: Record<string, unknown> = {}) {
  mockedAuth.mockReturnValue(makeAuth(over) as never);
}

const TRACK_NOTE =
  'Tap the Timeframe you want to track — your % of Target will be measured against it:';
const NOTE_ONLY =
  'Make a note of the Timeframe Numbers you want to track for results:';

/** The <Text> holding a timeframe label, e.g. WEEKLY. */
function timeframe(label: string) {
  return screen.getByText(label);
}

function flatten(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>(
      (acc, s) => ({ ...acc, ...flatten(s) }),
      {},
    );
  }
  return (style as Record<string, unknown>) ?? {};
}

// jest.setup.js's expo-router double has no canGoBack; the screen calls it.
function setCanGoBack(value: boolean) {
  (router as unknown as { canGoBack: jest.Mock }).canGoBack = jest.fn(() => value);
}

beforeEach(() => {
  signedIn();
  setCanGoBack(true);
});

describe('Ranges', () => {
  it('renders the screen chrome', () => {
    renderMain(<Ranges />);
    expect(screen.getByText('TEI - Effective Ranges')).toBeTruthy();
    expect(screen.getByText(/Recommended/)).toBeTruthy();
    expect(screen.getByText('Select a Target Range')).toBeTruthy();
  });

  it('renders all five EFFECTIVE_RANGES rows', () => {
    renderMain(<Ranges />);
    expect(EFFECTIVE_RANGES).toHaveLength(5);
    for (const r of EFFECTIVE_RANGES) {
      expect(screen.getByText(r.label)).toBeTruthy();
    }
    // Five rows, each with a Minimum and a Maximum caption.
    expect(screen.getAllByText('Minimum')).toHaveLength(5);
    expect(screen.getAllByText('Maximum')).toHaveLength(5);
  });

  it.each([
    ['WEEKLY', 55, 111],
    ['MONTHLY', 250, 500],
    ['QUARTERLY', 750, 1350],
    ['SEMI-ANNUAL', 1500, 2250],
    ['ANNUAL', 3000, 4500],
  ] as const)('%s shows %i and %i', (label, min, max) => {
    // The exact numbers must also match the source of truth.
    const row = EFFECTIVE_RANGES.find((r) => r.label === label);
    expect(row).toEqual({ label, min, max });

    renderMain(<Ranges />);
    expect(screen.getByText(String(min))).toBeTruthy();
    expect(screen.getByText(String(max))).toBeTruthy();
  });

  describe('selection', () => {
    it('starts with nothing selected (all labels grey)', () => {
      renderMain(<Ranges />);
      for (const r of EFFECTIVE_RANGES) {
        expect(flatten(timeframe(r.label).props.style).color).toBe('#A8A8A8');
      }
    });

    it('tapping a row sets targetRange in the store (label turns orange)', () => {
      renderMain(<Ranges />);
      fireEvent.press(timeframe('MONTHLY'));

      expect(flatten(timeframe('MONTHLY').props.style).color).toBe(colors.orange);
      expect(flatten(timeframe('WEEKLY').props.style).color).toBe('#A8A8A8');
    });

    it('marks the pressed row accessibilityState selected', () => {
      renderMain(<Ranges />);
      fireEvent.press(timeframe('ANNUAL'));

      const rows = screen.getAllByRole('button');
      const selected = rows.filter((r) => r.props.accessibilityState?.selected);
      expect(selected).toHaveLength(1);
    });

    it('tapping the same row again clears the selection', () => {
      renderMain(<Ranges />);
      fireEvent.press(timeframe('QUARTERLY'));
      expect(flatten(timeframe('QUARTERLY').props.style).color).toBe(colors.orange);

      fireEvent.press(timeframe('QUARTERLY'));
      expect(flatten(timeframe('QUARTERLY').props.style).color).toBe('#A8A8A8');
    });

    it('selecting a different row moves the selection', () => {
      renderMain(<Ranges />);
      fireEvent.press(timeframe('WEEKLY'));
      fireEvent.press(timeframe('SEMI-ANNUAL'));

      expect(flatten(timeframe('SEMI-ANNUAL').props.style).color).toBe(colors.orange);
      expect(flatten(timeframe('WEEKLY').props.style).color).toBe('#A8A8A8');
    });
  });

  describe('tier copy', () => {
    it('Elemental sees the informational "make a note" instruction', () => {
      signedIn({ profile: makeProfile({ tier: 'elemental' }) });
      renderMain(<Ranges />);
      expect(screen.getByText(NOTE_ONLY)).toBeTruthy();
      expect(screen.queryByText(TRACK_NOTE)).toBeNull();
    });

    it.each(['basic', 'premium'] as const)('%s sees the trackable instruction', (tier) => {
      signedIn({ profile: makeProfile({ tier }) });
      renderMain(<Ranges />);
      expect(screen.getByText(TRACK_NOTE)).toBeTruthy();
      expect(screen.queryByText(NOTE_ONLY)).toBeNull();
    });

    it('a null profile falls back to the informational copy', () => {
      signedIn({ profile: null });
      renderMain(<Ranges />);
      expect(screen.getByText(NOTE_ONLY)).toBeTruthy();
    });

    // SUSPECTED BUG: the copy is tier-gated but the tap handler is not.
    // An Elemental user is told to "make a note", yet every row is still a
    // live Pressable that writes targetRange into the store — a store value
    // the Elemental calculators have no "% of Target" bar to consume.
    it('SUSPECTED BUG: Elemental rows are still tappable and still set targetRange', () => {
      signedIn({ profile: makeProfile({ tier: 'elemental' }) });
      renderMain(<Ranges />);

      fireEvent.press(timeframe('WEEKLY'));
      expect(flatten(timeframe('WEEKLY').props.style).color).toBe(colors.orange);
    });
  });

  describe('navigation', () => {
    it('the CTA replaces to /calculator', () => {
      renderMain(<Ranges />);
      fireEvent.press(screen.getByText('TEI Calculator →'));
      expect(router.replace).toHaveBeenCalledWith('/calculator');
    });

    it('the back arrow goes back when there is history', () => {
      setCanGoBack(true);
      renderMain(<Ranges />);
      fireEvent.press(screen.getByLabelText('Back'));
      expect(router.back).toHaveBeenCalled();
      expect(router.replace).not.toHaveBeenCalled();
    });

    it('the back arrow replaces to /calculator with no history', () => {
      setCanGoBack(false);
      renderMain(<Ranges />);
      fireEvent.press(screen.getByLabelText('Back'));
      expect(router.back).not.toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith('/calculator');
    });
  });
});
