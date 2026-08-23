/**
 * app/calculator.tsx — ELEMENTAL Screen 2, the Standard Strength Training
 * calculator.
 *
 * Every displayed score is cross-checked against `calculateTei` called with
 * the same inputs, so the screen and the engine cannot drift apart silently.
 */
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import Calculator from '../../app/calculator';
import {
  DEFAULT_TARGET_MAX,
  EFFECTIVE_RANGES,
  LIMITS,
  calculateTei,
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
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useLocalSearchParams } = require('expo-router');

/** The four Standard variables, as the workbook's reference case. */
const REFERENCE = {
  sets: 11,
  restSeconds: 60,
  exertionPercent: 80,
  cardioMinutes: 41,
};

function auth(tier: 'elemental' | 'basic' | 'premium' | null = 'elemental') {
  (useAuth as jest.Mock).mockReturnValue(makeAuth(tier));
}

beforeEach(() => {
  auth('elemental');
  (useLocalSearchParams as jest.Mock).mockReturnValue({});
});

function pressCalculate() {
  fireEvent.press(screen.getByText('Calculate TEI'));
}

describe('calculator — rendering', () => {
  it('renders the TEI lockup, session block and the four variable rings', () => {
    renderCalc(<Calculator />);

    expect(screen.getByText('TOTAL EFFECT INDEX')).toBeTruthy();
    expect(screen.getByText('TEI')).toBeTruthy();
    expect(screen.getByText('This Session')).toBeTruthy();

    // One ring per Standard variable, each labelled for accessibility.
    for (const label of ['Sets', 'Seconds', '% Exert', 'Minutes']) {
      expect(screen.getByText(label)).toBeTruthy();
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
  });

  it('shows 0 and the entry hint before anything is entered', () => {
    renderCalc(<Calculator />);

    expect(screen.getByText('0')).toBeTruthy();
    expect(
      screen.getByText('Type into a circle, or tap its ••• for guidance.'),
    ).toBeTruthy();
  });

  it('does not crash and keeps every ring empty with an unset session', () => {
    renderCalc(<Calculator />);

    for (const label of ['Sets', 'Seconds', '% Exert', 'Minutes']) {
      expect(screen.getByLabelText(label).props.value).toBe('');
    }
  });

  it('disables Calculate TEI until all four variables have a value', () => {
    const { store } = renderCalc(<Calculator />);
    const cta = screen.getByText('Calculate TEI');

    expect(cta.parent?.props.accessibilityState?.disabled ?? cta.props.style)
      .toBeDefined();
    // Disabled styling: the label renders grey rather than orange.
    expect(cta.props.style.color).toBe('#5A5A5A');

    store.seed(REFERENCE);
    expect(screen.getByText('Calculate TEI').props.style.color).toBe(
      colors.orange,
    );
  });

  it('leaves the score at 0 when Calculate is pressed with an incomplete session', () => {
    const { store } = renderCalc(<Calculator />);
    store.set('sets', 11);

    pressCalculate();

    expect(screen.getByText('0')).toBeTruthy();
  });
});

describe('calculator — TEI agrees with the tei.ts engine', () => {
  const cases: Array<[string, typeof REFERENCE]> = [
    ['workbook reference case', REFERENCE],
    ['short rest, high exertion', {
      sets: 20, restSeconds: 30, exertionPercent: 100, cardioMinutes: 0,
    }],
    ['interpolated rest and cardio', {
      sets: 14, restSeconds: 75, exertionPercent: 65, cardioMinutes: 30,
    }],
    ['cardio only (zero-filled strength)', {
      sets: 0, restSeconds: 0, exertionPercent: 0, cardioMinutes: 61,
    }],
    // 240s is LIMITS.rest.max and the last REST_DATASET row, so this is the
    // longest rest the screen accepts and it plots to that final row.
    ['rest at the end of the dataset', {
      sets: 10, restSeconds: 240, exertionPercent: 80, cardioMinutes: 0,
    }],
  ];

  it.each(cases)('%s', (_name, inputs) => {
    const { store } = renderCalc(<Calculator />, { seed: inputs });

    pressCalculate();

    const expected = displayTei(calculateTei(inputs).tei);
    expect(screen.getByText(String(expected))).toBeTruthy();
    expect(store.current().sets).toBe(inputs.sets);
  });

  it('renders the score through MaskedNumber in orange once calculated', () => {
    renderCalc(<Calculator />, { seed: REFERENCE });
    pressCalculate();

    const expected = String(displayTei(calculateTei(REFERENCE).tei));
    const node = screen.getByText(expected);
    // The big number is orange only after a calculation; before that the
    // placeholder 0 is drawn in near-black.
    expect(node.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: colors.orange })]),
    );
  });

  it('recomputes when a variable changes and Calculate is pressed again', () => {
    const { store } = renderCalc(<Calculator />, { seed: REFERENCE });
    pressCalculate();
    expect(screen.getByText(String(displayTei(calculateTei(REFERENCE).tei)))).toBeTruthy();

    const next = { ...REFERENCE, sets: 22 };
    store.set('sets', 22);
    // `showResult` stays true, so the score follows the store immediately.
    expect(screen.getByText(String(displayTei(calculateTei(next).tei)))).toBeTruthy();
  });

  it('accepts typed input into a ring and folds it into the score', () => {
    const { store } = renderCalc(<Calculator />, {
      seed: { restSeconds: 60, exertionPercent: 80, cardioMinutes: 41 },
    });

    fireEvent.changeText(screen.getByLabelText('Sets'), '11');
    expect(store.current().sets).toBe(11);

    pressCalculate();
    expect(screen.getByText(String(displayTei(calculateTei(REFERENCE).tei)))).toBeTruthy();
  });

  it('strips non-digits from ring input', () => {
    const { store } = renderCalc(<Calculator />);

    fireEvent.changeText(screen.getByLabelText('Sets'), '1a2b');
    expect(store.current().sets).toBe(12);

    fireEvent.changeText(screen.getByLabelText('Sets'), '');
    expect(store.current().sets).toBeNull();
  });
});

describe('calculator — over-range visual states', () => {
  function overRangeGradients() {
    // The over-range treatment is a LinearGradient (mocked to a View) whose
    // colours are the red stops from Ring.tsx.
    return screen
      .UNSAFE_root.findAllByType(
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('expo-linear-gradient').LinearGradient,
      )
      .filter((n: { props: { colors?: string[] } }) =>
        n.props.colors?.[0] === 'rgba(255,34,34,0.85)',
      );
  }

  it('shows no red gradient when every value is inside its range', () => {
    renderCalc(<Calculator />, { seed: REFERENCE });
    expect(overRangeGradients()).toHaveLength(0);
  });

  it(`flags sets above LIMITS.sets.overAt (${LIMITS.sets.overAt})`, () => {
    const { store } = renderCalc(<Calculator />, { seed: REFERENCE });

    store.set('sets', LIMITS.sets.overAt);
    expect(overRangeGradients()).toHaveLength(0);

    store.set('sets', LIMITS.sets.overAt + 1);
    expect(overRangeGradients()).toHaveLength(1);
  });

  it(`flags cardio above LIMITS.cardio.overAt (${LIMITS.cardio.overAt})`, () => {
    const { store } = renderCalc(<Calculator />, { seed: REFERENCE });

    store.set('cardioMinutes', LIMITS.cardio.overAt);
    expect(overRangeGradients()).toHaveLength(0);

    store.set('cardioMinutes', LIMITS.cardio.overAt + 1);
    expect(overRangeGradients()).toHaveLength(1);
  });

  it('flags a rest shorter than LIMITS.rest.min but not a rest of 0', () => {
    const { store } = renderCalc(<Calculator />, { seed: REFERENCE });

    store.set('restSeconds', 0);
    expect(overRangeGradients()).toHaveLength(0);

    store.set('restSeconds', LIMITS.rest.min - 1);
    expect(overRangeGradients()).toHaveLength(1);

    store.set('restSeconds', LIMITS.rest.min);
    expect(overRangeGradients()).toHaveLength(0);
  });

  // The rings hand min/max to the arc geometry only, so an out-of-range value
  // typed straight into a circle used to be scored as if it were valid. The
  // same LIMITS the guided /entry/* screens enforce now block the calculation.
  it('blocks out-of-range direct ring entry rather than scoring it', () => {
    const bogus = {
      sets: 99, // LIMITS.sets.max is 44
      restSeconds: 60,
      exertionPercent: 300, // LIMITS.exertion.max is 100
      cardioMinutes: 3, // below LIMITS.cardio.min of 7, and not 0
    };
    renderCalc(<Calculator />, { seed: bogus });

    pressCalculate();

    // The first offending variable is named, and nothing is scored.
    expect(
      screen.getByText(
        `Sets must be between ${LIMITS.sets.min} and ${LIMITS.sets.max}.`,
      ),
    ).toBeTruthy();
    expect(
      screen.queryByText(String(displayTei(calculateTei(bogus).tei))),
    ).toBeNull();
    expect(screen.getByText('0')).toBeTruthy();
  });

  it.each([
    ['sets', 99, `Sets must be between ${LIMITS.sets.min} and ${LIMITS.sets.max}.`],
    ['restSeconds', 400, `Seconds must be between ${LIMITS.rest.min} and ${LIMITS.rest.max}.`],
    ['exertionPercent', 300, `% Exert must be between ${LIMITS.exertion.min} and ${LIMITS.exertion.max}.`],
    ['cardioMinutes', 3, `Minutes must be 0 for no cardio, or between ${LIMITS.cardio.min} and ${LIMITS.cardio.max}.`],
  ] as Array<[keyof typeof REFERENCE, number, string]>)(
    'blocks an out-of-range %s on its own',
    (field, bad, message) => {
      renderCalc(<Calculator />, { seed: { ...REFERENCE, [field]: bad } });

      pressCalculate();

      expect(screen.getByText(message)).toBeTruthy();
      expect(screen.getByText('0')).toBeTruthy();
    },
  );

  // Exertion's valid band is 50-100, so either side of it is out of range.
  it('the % Exert ring flags a value outside the 50-100 band', () => {
    const { store } = renderCalc(<Calculator />, { seed: REFERENCE });

    store.set('exertionPercent', LIMITS.exertion.max + 1);
    expect(overRangeGradients()).toHaveLength(1);

    store.set('exertionPercent', LIMITS.exertion.min - 1);
    expect(overRangeGradients()).toHaveLength(1);

    store.set('exertionPercent', LIMITS.exertion.min);
    expect(overRangeGradients()).toHaveLength(0);

    // 0 is the zero-fill of a cardio-only session, not a bad entry.
    store.set('exertionPercent', 0);
    expect(overRangeGradients()).toHaveLength(0);
  });
});

describe('calculator — implausible TEI prompt', () => {
  /** 44 sets / 30s rest / 100% exertion / 61 cardio minutes ~= 58.7 TEI. */
  const HEAVY = {
    sets: 44,
    restSeconds: 30,
    exertionPercent: 100,
    cardioMinutes: 61,
  };

  /** The exact copy the client wrote, for a given score. */
  const warning = (tei: number) =>
    `TEI ${tei.toFixed(0)} is beyond a survivable workload — you may need to review how you are defining your data.`;

  // `showToast` keeps only the newest message, so firing the warning as its
  // own toast meant the score toast that followed destroyed it in the same
  // tick. The warning is now shown INSTEAD of the plain score toast, so it
  // reaches the user on every tier — including Elemental, which never saves.
  it(`on Elemental the implausible prompt (>${LIMITS.tei.implausibleAbove}) is what the user is left with`, async () => {
    auth('elemental');
    const tei = calculateTei(HEAVY).tei;
    expect(tei).toBeGreaterThan(LIMITS.tei.implausibleAbove);

    const { store } = renderCalc(<Calculator />, { seed: HEAVY });
    pressCalculate();

    await waitFor(() => expect(store.toast()).not.toBeNull());
    expect(store.toast()).toBe(warning(tei));
    // The plain score toast no longer clobbers it.
    expect(store.toast()).not.toBe(`TEI ${tei.toFixed(2)} for this session`);
  });

  it(`warns when the score exceeds LIMITS.tei.implausibleAbove (${LIMITS.tei.implausibleAbove}) on a saving tier`, async () => {
    auth('basic');
    const tei = calculateTei(HEAVY).tei;

    const { store } = renderCalc(<Calculator />, { seed: HEAVY });
    pressCalculate();

    // The session still saves, but the warning — not "Saved — TEI x" — is the
    // message left on screen.
    await waitFor(() => expect(saveSession).toHaveBeenCalled());
    await waitFor(() => expect(store.toast()).toBe(warning(tei)));
  });

  it('does not warn at or below the implausible threshold', async () => {
    const { store } = renderCalc(<Calculator />, { seed: REFERENCE });
    pressCalculate();

    await waitFor(() => expect(store.toast()).not.toBeNull());
    expect(store.toast()).not.toMatch(/survivable/);
    expect(store.toast()).toBe(
      `TEI ${calculateTei(REFERENCE).tei.toFixed(2)} for this session`,
    );
  });
});

describe('calculator — cardio 0 vs 1-6', () => {
  it('treats 0 cardio minutes as valid — the session still scores', () => {
    const inputs = { ...REFERENCE, cardioMinutes: 0 };
    renderCalc(<Calculator />, { seed: inputs });

    // Complete: 0 is a real value, not "unset".
    expect(screen.getByText('Calculate TEI').props.style.color).toBe(
      colors.orange,
    );

    pressCalculate();
    // Engine contributes nothing for 0, matching LIMITS.cardio.allowsZero.
    expect(calculateTei(inputs).cardioValue).toBe(0);
    expect(
      screen.getByText(String(displayTei(calculateTei(inputs).tei))),
    ).toBeTruthy();
  });

  // LIMITS.cardio says any entry above 0 must be >= 7. The screen used to
  // check only `> overAt` (65), so 1-6 scored exactly like a legal value;
  // Calculate now refuses it, matching the /entry/cardio screen's floor.
  it.each([1, 3, 6])(
    'blocks a cardio of %i, below LIMITS.cardio.min of 7',
    (minutes) => {
      const inputs = { ...REFERENCE, cardioMinutes: minutes };
      renderCalc(<Calculator />, { seed: inputs });

      pressCalculate();

      expect(
        screen.getByText(
          `Minutes must be 0 for no cardio, or between ${LIMITS.cardio.min} and ${LIMITS.cardio.max}.`,
        ),
      ).toBeTruthy();
      expect(
        screen.queryByText(String(displayTei(calculateTei(inputs).tei))),
      ).toBeNull();
    },
  );
});

describe('calculator — cardio-first zero-fill', () => {
  it('zero-fills the strength variables when cardio is entered first', () => {
    const { store } = renderCalc(<Calculator />);

    fireEvent.changeText(screen.getByLabelText('Minutes'), '41');

    expect(store.current()).toMatchObject({
      cardioMinutes: 41,
      sets: 0,
      restSeconds: 0,
      exertionPercent: 0,
    });
  });

  it('leaves existing strength values alone when cardio is entered later', () => {
    const { store } = renderCalc(<Calculator />, { seed: { sets: 11 } });

    fireEvent.changeText(screen.getByLabelText('Minutes'), '41');

    expect(store.current()).toMatchObject({
      cardioMinutes: 41,
      sets: 11,
      restSeconds: null,
      exertionPercent: null,
    });
  });
});

describe('calculator — navigation', () => {
  it('routes each ellipsis to its guided entry screen, tagged from=standard', () => {
    renderCalc(<Calculator />);

    const expected: Array<[string, string]> = [
      ['More about Sets', '/entry/sets?from=standard'],
      ['More about Seconds', '/entry/rest?from=standard'],
      ['More about % Exert', '/entry/exertion?from=standard'],
      ['More about Minutes', '/entry/cardio?from=standard'],
    ];

    for (const [label, route] of expected) {
      (router.push as jest.Mock).mockClear();
      fireEvent.press(screen.getByLabelText(label));
      expect(router.push).toHaveBeenCalledWith(route);
    }
  });

  it('opens the Effective Ranges screen from the Ranges button', () => {
    renderCalc(<Calculator />);
    fireEvent.press(screen.getByText('Ranges'));
    expect(router.push).toHaveBeenCalledWith('/ranges');
  });

  it('falls back to /home when there is nothing to go back to', () => {
    (router as unknown as { canGoBack: jest.Mock }).canGoBack = jest.fn(
      () => false,
    );
    renderCalc(<Calculator />);

    fireEvent.press(screen.getByLabelText('Back'));
    expect(router.replace).toHaveBeenCalledWith('/home');
  });

  it('uses router.back() when history exists', () => {
    (router as unknown as { canGoBack: jest.Mock }).canGoBack = jest.fn(
      () => true,
    );
    renderCalc(<Calculator />);

    fireEvent.press(screen.getByLabelText('Back'));
    expect(router.back).toHaveBeenCalled();
  });

  it('goes to /home once a score is on screen', () => {
    // After calculating, the session is done — back belongs on Home rather
    // than on whichever screen pushed the calculator.
    (router as unknown as { canGoBack: jest.Mock }).canGoBack = jest.fn(
      () => true,
    );
    renderCalc(<Calculator />, { seed: REFERENCE });
    pressCalculate();

    fireEvent.press(screen.getByLabelText('Back'));
    expect(router.replace).toHaveBeenCalledWith('/home');
    expect(router.back).not.toHaveBeenCalled();
  });
});

describe('calculator — tier behaviour', () => {
  it('hides the % of Target bar on Elemental', () => {
    auth('elemental');
    renderCalc(<Calculator />, { seed: REFERENCE });
    expect(screen.queryByText(/of .*Target/)).toBeNull();
  });

  it('shows the % of Target bar on Basic and above', () => {
    auth('basic');
    renderCalc(<Calculator />, { seed: REFERENCE });
    expect(screen.getByText('of Target')).toBeTruthy();
  });

  // With no timeframe chosen the denominator is the WEEKLY period total, not
  // LIMITS.tei.max — that is a single-SESSION ceiling and read three times
  // too high.
  it('measures % of Target against the WEEKLY range with none chosen', () => {
    auth('basic');
    renderCalc(<Calculator />, { seed: REFERENCE });
    pressCalculate();

    const tei = calculateTei(REFERENCE).tei;
    const pct = Math.round(
      Math.max(0, Math.min(1, tei / DEFAULT_TARGET_MAX)) * 100,
    );
    expect(screen.getByText(`${pct}%`)).toBeTruthy();
  });

  it('does not persist a session on Elemental — it only toasts the score', async () => {
    auth('elemental');
    const { store } = renderCalc(<Calculator />, { seed: REFERENCE });

    pressCalculate();

    await waitFor(() =>
      expect(store.toast()).toBe(
        `TEI ${calculateTei(REFERENCE).tei.toFixed(2)} for this session`,
      ),
    );
    expect(saveSession).not.toHaveBeenCalled();
  });

  it('persists the session on Basic with the engine score', async () => {
    auth('basic');
    const { store } = renderCalc(<Calculator />, { seed: REFERENCE });

    pressCalculate();

    await waitFor(() => expect(saveSession).toHaveBeenCalled());
    expect(saveSession).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        ...REFERENCE,
        tei: Number(calculateTei(REFERENCE).tei.toFixed(2)),
      }),
    );
    await waitFor(() => expect(store.toast()).toMatch(/^Saved — TEI/));
  });

  it('surfaces a save failure inline rather than only as a toast', async () => {
    auth('basic');
    (saveSession as jest.Mock).mockResolvedValueOnce({ error: 'network down' });
    renderCalc(<Calculator />, { seed: REFERENCE });

    pressCalculate();

    await waitFor(() =>
      expect(
        screen.getByText('Could not save session: network down'),
      ).toBeTruthy(),
    );
  });

  it('refuses to re-save a session that already saved', async () => {
    auth('basic');
    const { store } = renderCalc(<Calculator />, { seed: REFERENCE });

    pressCalculate();
    await waitFor(() => expect(saveSession).toHaveBeenCalledTimes(1));

    pressCalculate();
    await waitFor(() =>
      expect(store.toast()).toBe('This session is already saved.'),
    );
    expect(saveSession).toHaveBeenCalledTimes(1);
  });
});

describe('calculator — planner mode', () => {
  it('saves a PLAN and returns to /plan when ?plan= is present on Premium', async () => {
    auth('premium');
    (useLocalSearchParams as jest.Mock).mockReturnValue({ plan: '2026-05-01' });
    renderCalc(<Calculator />, { seed: REFERENCE });

    pressCalculate();

    await waitFor(() => expect(savePlan).toHaveBeenCalled());
    expect(savePlan).toHaveBeenCalledWith(
      expect.objectContaining({
        plannedFor: '2026-05-01',
        calculator: 'standard',
        tei: Number(calculateTei(REFERENCE).tei.toFixed(2)),
      }),
    );
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/plan'));
  });

  it('blocks planning below Premium', async () => {
    auth('basic');
    (useLocalSearchParams as jest.Mock).mockReturnValue({ plan: '2026-05-01' });
    const { store } = renderCalc(<Calculator />, { seed: REFERENCE });

    pressCalculate();

    await waitFor(() =>
      expect(store.toast()).toBe('Planning needs TEI Premium.'),
    );
    expect(savePlan).not.toHaveBeenCalled();
  });

  // The `plan` branch used to return before the LIMITS.tei.implausibleAbove
  // check, so an unsurvivable day could be planned with no prompt at all. The
  // check now runs before the branch, and the warning replaces the
  // "Planned — TEI x" toast so it survives the navigation to /plan.
  it('planner mode shows the implausible-TEI prompt before navigating away', async () => {
    auth('premium');
    (useLocalSearchParams as jest.Mock).mockReturnValue({ plan: '2026-05-01' });
    const heavy = {
      sets: 44,
      restSeconds: 30,
      exertionPercent: 100,
      cardioMinutes: 61,
    };
    expect(calculateTei(heavy).tei).toBeGreaterThan(
      LIMITS.tei.implausibleAbove,
    );

    const { store } = renderCalc(<Calculator />, { seed: heavy });
    pressCalculate();

    await waitFor(() => expect(savePlan).toHaveBeenCalled());
    expect(store.toast()).toBe(
      `TEI ${calculateTei(heavy).tei.toFixed(0)} is beyond a survivable workload — you may need to review how you are defining your data.`,
    );
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/plan'));
  });
});

describe('calculator — effective ranges data', () => {
  it('exposes every documented timeframe to the target bar', () => {
    expect(EFFECTIVE_RANGES.map((r) => r.label)).toEqual([
      'WEEKLY',
      'MONTHLY',
      'QUARTERLY',
      'SEMI-ANNUAL',
      'ANNUAL',
    ]);
  });
});
