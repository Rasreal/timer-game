/**
 * app/calc/_shared.tsx — the chrome every PREMIUM calculator sits inside.
 *
 * `CalcShell` owns the big score, the % of Target bar, the tier guard, the
 * implausible-TEI prompt and both save paths, so it is exercised here directly
 * with a stub `compute` rather than through one of the four screens.
 */
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CalcShell, RingRow } from '../../app/calc/_shared';
import {
  DEFAULT_TARGET_MAX,
  EFFECTIVE_RANGES,
  LIMITS,
  displayTei,
} from '../../src/lib/tei';
import { colors } from '../../src/theme';
import { makeAuth, renderCalc } from '../helpers/calcRender';

jest.mock('../../src/lib/supabase', () => ({ supabase: {} }));
jest.mock('../../src/auth', () => ({ useAuth: jest.fn() }));
jest.mock('../../src/lib/sessions', () => ({
  saveSession: jest.fn(async () => ({ error: null })),
}));
jest.mock('../../src/lib/plans', () => ({
  savePlan: jest.fn(async () => ({ error: null })),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useAuth } = require('../../src/auth');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { saveSession } = require('../../src/lib/sessions');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { savePlan } = require('../../src/lib/plans');

function auth(tier: 'elemental' | 'basic' | 'premium' | null = 'premium') {
  (useAuth as jest.Mock).mockReturnValue(makeAuth(tier));
}

beforeEach(() => {
  auth('premium');
  (useLocalSearchParams as jest.Mock).mockReturnValue({});
  (router as unknown as { canGoBack: jest.Mock }).canGoBack = jest.fn(() => true);
});

interface ShellOptions {
  tei?: number;
  complete?: boolean;
  showRangesPill?: boolean;
  calculator?: 'standard' | 'breakdown' | 'circuit' | 'cardio' | 'yoga';
  saveFields?: Record<string, number | null>;
  children?: React.ReactNode;
}

function renderShell(options: ShellOptions = {}) {
  const {
    tei = 13.78,
    complete = true,
    showRangesPill = false,
    calculator = 'yoga',
    saveFields = { cardioMinutes: 41, yogaMinutes: 53, exertionPercent: 80 },
    children = <RingRow><Text>ring slot</Text></RingRow>,
  } = options;

  const compute = jest.fn(() => tei);

  const result = renderCalc(
    <CalcShell
      calculator={calculator}
      sessionLabel="YOGA Training"
      complete={complete}
      compute={compute}
      saveFields={saveFields as never}
      showRangesPill={showRangesPill}
    >
      {children}
    </CalcShell>,
  );

  return Object.assign(result, { compute });
}

const pressCalculate = () => fireEvent.press(screen.getByText('Calculate TEI'));
const pressSave = () => fireEvent.press(screen.getByText('SAVE'));

describe('CalcShell — rendering', () => {
  it('renders the stacked lockup, session block, label and both CTAs', () => {
    renderShell();

    for (const word of ['TOTAL', 'EFFECT', 'INDEX', 'TEI']) {
      expect(screen.getByText(word)).toBeTruthy();
    }
    expect(screen.getByText('This Session')).toBeTruthy();
    expect(screen.getByText('of Target')).toBeTruthy();
    expect(screen.getByText('YOGA Training')).toBeTruthy();
    expect(screen.getByText('Calculate TEI')).toBeTruthy();
    expect(screen.getByText('SAVE')).toBeTruthy();
  });

  it('renders the rings its screen supplies', () => {
    renderShell({ children: <RingRow><Text>ring slot</Text></RingRow> });
    expect(screen.getByText('ring slot')).toBeTruthy();
  });

  it('opens with a score of 0 and 0% of target', () => {
    renderShell();
    expect(screen.getByText('0')).toBeTruthy();
    expect(screen.getByText('0%')).toBeTruthy();
  });

  it('does not crash with an empty session draft', () => {
    expect(() =>
      renderShell({ complete: false, saveFields: { cardioMinutes: 0 } }),
    ).not.toThrow();
  });

  it('shows the Effective Ranges pill only when asked', () => {
    const { unmount } = renderShell({ showRangesPill: false });
    expect(screen.queryByText('Effective Ranges')).toBeNull();
    unmount();

    renderShell({ showRangesPill: true });
    fireEvent.press(screen.getByText('Effective Ranges'));
    expect(router.push).toHaveBeenCalledWith('/ranges');
  });
});

describe('CalcShell — calculate', () => {
  it('calls compute only on demand and shows the rounded score', () => {
    const { compute } = renderShell({ tei: 13.78 });

    expect(compute).not.toHaveBeenCalled();

    pressCalculate();

    expect(compute).toHaveBeenCalledTimes(1);
    expect(screen.getByText(String(displayTei(13.78)))).toBeTruthy();
  });

  it.each([
    [0, 0],
    [3.4, 3],
    [13.78, 14],
    [22.5, 23],
    [58.7, 59],
  ])('rounds a TEI of %f to %i via displayTei', (tei, expected) => {
    renderShell({ tei });
    pressCalculate();
    expect(screen.getByText(String(expected))).toBeTruthy();
    expect(displayTei(tei)).toBe(expected);
  });

  it('does nothing when the screen is incomplete', () => {
    const { compute } = renderShell({ complete: false });
    pressCalculate();
    expect(compute).not.toHaveBeenCalled();
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('disables the Calculate CTA when incomplete', () => {
    renderShell({ complete: false });
    expect(screen.getByText('Calculate TEI').props.style.color).toBe('#5A5A5A');
  });
});

describe('CalcShell — over-range score colour', () => {
  it(`draws the score orange at or below LIMITS.tei.overAt (${LIMITS.tei.overAt})`, () => {
    renderShell({ tei: LIMITS.tei.overAt });
    pressCalculate();

    const node = screen.getByText(String(displayTei(LIMITS.tei.overAt)));
    expect(node.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ color: colors.orange }),
      ]),
    );
  });

  it(`draws the score red above LIMITS.tei.overAt (${LIMITS.tei.overAt})`, () => {
    const tei = LIMITS.tei.overAt + 0.5;
    renderShell({ tei });
    pressCalculate();

    const node = screen.getByText(String(displayTei(tei)));
    expect(node.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: colors.red })]),
    );
  });

  // SUSPECTED BUG: the red state keys off the raw TEI while the glyph shows
  // the ROUNDED score, so a TEI of 22.4 renders as "22" — the exact value of
  // LIMITS.tei.overAt — yet is painted red, and 21.6 renders as "22" in
  // orange. Two identical-looking scores get opposite treatments.
  it('SUSPECTED BUG: a rounded score of 22 renders red or orange depending on the hidden decimal', () => {
    const { unmount } = renderShell({ tei: 22.4 });
    pressCalculate();
    expect(screen.getByText('22').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: colors.red })]),
    );
    unmount();

    renderShell({ tei: 21.6 });
    pressCalculate();
    expect(screen.getByText('22').props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ color: colors.orange }),
      ]),
    );
  });
});

describe('CalcShell — implausible TEI prompt', () => {
  it(`prompts above LIMITS.tei.implausibleAbove (${LIMITS.tei.implausibleAbove})`, () => {
    const tei = LIMITS.tei.implausibleAbove + 5.7;
    const { store } = renderShell({ tei });

    pressCalculate();

    expect(store.toast()).toBe(
      `TEI ${tei.toFixed(0)} is beyond a survivable workload — you may need to review how you are defining your data.`,
    );
  });

  it('does not prompt exactly at the threshold', () => {
    const { store } = renderShell({ tei: LIMITS.tei.implausibleAbove });
    pressCalculate();
    expect(store.toast()).toBeNull();
  });

  it('does not prompt for an ordinary score', () => {
    const { store } = renderShell({ tei: 13.78 });
    pressCalculate();
    expect(store.toast()).toBeNull();
  });
});

describe('CalcShell — % of Target bar', () => {
  it('measures against the WEEKLY range when none has been chosen', () => {
    const tei = 13.78;
    renderShell({ tei });
    pressCalculate();

    const pct = Math.round((tei / DEFAULT_TARGET_MAX) * 100);
    expect(screen.getByText(`${pct}%`)).toBeTruthy();
  });

  it('clamps the bar to 100% for a score above the target', () => {
    renderShell({ tei: DEFAULT_TARGET_MAX * 3 });
    pressCalculate();
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('clamps the bar to 0% for a negative score', () => {
    renderShell({ tei: -20 });
    pressCalculate();
    expect(screen.getByText('0%')).toBeTruthy();
  });

  // The fallback denominator is the WEEKLY period total, not LIMITS.tei.max —
  // that is a SINGLE-SESSION ceiling (33) and measuring against it read more
  // than three times too high for a user who never visited Ranges.
  it('defaults to the WEEKLY period total rather than the single-session ceiling', () => {
    const weekly = EFFECTIVE_RANGES.find((r) => r.label === 'WEEKLY')!;
    expect(DEFAULT_TARGET_MAX).toBe(weekly.max);
    expect(LIMITS.tei.max).toBe(33);
    expect(weekly.max).toBe(111);

    renderShell({ tei: 16.5 });
    pressCalculate();

    // 15% against WEEKLY, not the 50% the single-session ceiling gave.
    expect(screen.getByText('15%')).toBeTruthy();
    expect(screen.queryByText('50%')).toBeNull();
  });
});

describe('CalcShell — tier guard', () => {
  it('bounces a non-Premium user to /home', () => {
    auth('basic');
    renderShell();
    expect(router.replace).toHaveBeenCalledWith('/home');
  });

  it('bounces an Elemental user to /home', () => {
    auth('elemental');
    renderShell();
    expect(router.replace).toHaveBeenCalledWith('/home');
  });

  it('waits rather than bouncing while the profile is still null', () => {
    auth(null);
    renderShell();
    expect(router.replace).not.toHaveBeenCalledWith('/home');
  });

  it('lets a Premium user stay', () => {
    auth('premium');
    renderShell();
    expect(router.replace).not.toHaveBeenCalledWith('/home');
  });
});

describe('CalcShell — save', () => {
  it('refuses to save before a calculation', async () => {
    const { store } = renderShell();

    pressSave();

    await waitFor(() =>
      expect(store.toast()).toBe('Calculate the TEI before saving.'),
    );
    expect(saveSession).not.toHaveBeenCalled();
  });

  it('persists the calculated score with its calculator id and save fields', async () => {
    const { store } = renderShell({
      tei: 16.5,
      calculator: 'yoga',
      saveFields: { cardioMinutes: 41, yogaMinutes: 53, exertionPercent: 80 },
    });

    pressCalculate();
    pressSave();

    await waitFor(() => expect(saveSession).toHaveBeenCalled());
    expect(saveSession).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        calculator: 'yoga',
        tei: 16.5,
        cardioMinutes: 41,
        yogaMinutes: 53,
        exertionPercent: 80,
        // Unused variables are nulled out on the row.
        sets: null,
        restSeconds: null,
        breakdowns: null,
        exercises: null,
        circuits: null,
      }),
    );
    await waitFor(() => expect(store.toast()).toBe('Saved — TEI 16.50'));
  });

  it('reports a save failure as a toast', async () => {
    (saveSession as jest.Mock).mockResolvedValueOnce({ error: 'offline' });
    const { store } = renderShell({ tei: 16.5 });

    pressCalculate();
    pressSave();

    await waitFor(() =>
      expect(store.toast()).toBe('Could not save: offline'),
    );
  });

  it('tells an Elemental user that saving needs a paid tier', async () => {
    auth('elemental');
    const { store } = renderShell({ tei: 16.5 });

    pressCalculate();
    pressSave();

    await waitFor(() =>
      expect(store.toast()).toBe('Saving sessions needs TEI Basic or Premium.'),
    );
    expect(saveSession).not.toHaveBeenCalled();
  });

  // The tier guard at the top of the component is an effect, so a Basic user
  // can press SAVE before the redirect lands. persist() gates on premium
  // itself rather than merely excluding Elemental.
  it('refuses to persist a Premium session for a Basic user who wins the redirect race', async () => {
    auth('basic');
    const { store } = renderShell({ tei: 16.5, calculator: 'circuit' });

    expect(router.replace).toHaveBeenCalledWith('/home');

    pressCalculate();
    pressSave();

    await waitFor(() =>
      expect(store.toast()).toBe('Saving sessions needs TEI Basic or Premium.'),
    );
    expect(saveSession).not.toHaveBeenCalled();
  });

  // Same `saved` guard app/calculator.tsx uses: SAVE is single-shot, so a
  // second press must not write a duplicate row.
  it('writes only one row however often SAVE is pressed', async () => {
    const { store } = renderShell({ tei: 16.5 });

    pressCalculate();
    pressSave();
    await waitFor(() => expect(saveSession).toHaveBeenCalledTimes(1));

    pressSave();
    await waitFor(() =>
      expect(store.toast()).toBe('This session is already saved.'),
    );
    expect(saveSession).toHaveBeenCalledTimes(1);
  });

  // A failed write leaves the session unsaved, so SAVE must stay usable.
  it('allows a retry after a failed save', async () => {
    (saveSession as jest.Mock).mockResolvedValueOnce({ error: 'db down' });
    const { store } = renderShell({ tei: 16.5 });

    pressCalculate();
    pressSave();
    await waitFor(() => expect(store.toast()).toBe('Could not save: db down'));

    pressSave();
    await waitFor(() => expect(saveSession).toHaveBeenCalledTimes(2));
  });
});

describe('CalcShell — planner mode', () => {
  beforeEach(() => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ plan: '2026-05-01' });
  });

  it('saves a plan for the requested day and returns to /plan', async () => {
    const { store } = renderShell({ tei: 16.5, calculator: 'yoga' });

    pressCalculate();
    pressSave();

    await waitFor(() => expect(savePlan).toHaveBeenCalled());
    expect(savePlan).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        plannedFor: '2026-05-01',
        calculator: 'yoga',
        tei: 16.5,
      }),
    );
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/plan'));
    expect(store.toast()).toBe('Planned — TEI 16.50');
    expect(saveSession).not.toHaveBeenCalled();
  });

  it('reports a plan failure and stays on the screen', async () => {
    (savePlan as jest.Mock).mockResolvedValueOnce({ error: 'db down' });
    const { store } = renderShell({ tei: 16.5 });

    pressCalculate();
    pressSave();

    await waitFor(() =>
      expect(store.toast()).toBe('Could not save plan: db down'),
    );
    expect(router.replace).not.toHaveBeenCalledWith('/plan');
  });

  it('tells an Elemental user that planning needs Premium', async () => {
    auth('elemental');
    const { store } = renderShell({ tei: 16.5 });

    pressCalculate();
    pressSave();

    await waitFor(() =>
      expect(store.toast()).toBe('Planning needs TEI Premium.'),
    );
    expect(savePlan).not.toHaveBeenCalled();
  });

  // Plans and sessions must store the same number for the same workload, or
  // a later plan-vs-actual comparison is comparing different precisions.
  it('rounds the planned TEI to 2dp, exactly as a session row is', async () => {
    const messy = 19.060000000000002;
    renderShell({ tei: messy });

    pressCalculate();
    pressSave();

    await waitFor(() => expect(savePlan).toHaveBeenCalled());
    expect((savePlan as jest.Mock).mock.calls[0][0].tei).toBe(19.06);
  });
});

describe('CalcShell — navigation and stubs', () => {
  it('uses router.back() when there is history', () => {
    (router as unknown as { canGoBack: jest.Mock }).canGoBack = jest.fn(
      () => true,
    );
    renderShell();
    fireEvent.press(screen.getByLabelText('Back'));
    expect(router.back).toHaveBeenCalled();
  });

  it('falls back to /session-type when there is no history', () => {
    (router as unknown as { canGoBack: jest.Mock }).canGoBack = jest.fn(
      () => false,
    );
    renderShell();
    fireEvent.press(screen.getByLabelText('Back'));
    expect(router.replace).toHaveBeenCalledWith('/session-type');
  });

  it('goes to /home once a score has been calculated', () => {
    // The session is finished at that point, so returning to the selector
    // would invite the user to re-pick a type they had already logged.
    (router as unknown as { canGoBack: jest.Mock }).canGoBack = jest.fn(
      () => true,
    );
    renderShell();
    pressCalculate();
    fireEvent.press(screen.getByLabelText('Back'));
    expect(router.replace).toHaveBeenCalledWith('/home');
    expect(router.back).not.toHaveBeenCalled();
  });

  it('still uses history when nothing has been calculated yet', () => {
    (router as unknown as { canGoBack: jest.Mock }).canGoBack = jest.fn(
      () => true,
    );
    renderShell();
    fireEvent.press(screen.getByLabelText('Back'));
    expect(router.back).toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalledWith('/home');
  });

  // NOT PORTED: the session-date ellipsis is an acknowledged stub.
  it('the session-date ellipsis only toasts that it is unimplemented', () => {
    const { store } = renderShell();
    fireEvent.press(screen.getByLabelText('Change session date'));
    expect(store.toast()).toBe(
      'Date picking is not wired up on this calculator yet.',
    );
  });
});
