/**
 * app/calc/breakdown.tsx — PREMIUM Breakdown Strength Training calculator.
 *
 * Every score is cross-checked against `calculateBreakdownTei` with the same
 * inputs, so the screen cannot drift from the engine.
 */
import { fireEvent, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import BreakdownCalculator from '../../app/calc/breakdown';
import {
  CALCULATOR_FIELDS,
  CALCULATOR_LABELS,
  LIMITS,
  calculateBreakdownTei,
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

const REFERENCE = {
  sets: 11,
  breakdowns: 2,
  restSeconds: 60,
  exertionPercent: 80,
  cardioMinutes: 41,
};

const RING_LABELS = ['Sets', 'Breakdowns', 'Seconds', '% Exert', 'Minutes'];

beforeEach(() => {
  (useAuth as jest.Mock).mockReturnValue(makeAuth('premium'));
  (useLocalSearchParams as jest.Mock).mockReturnValue({});
  (router as unknown as { canGoBack: jest.Mock }).canGoBack = jest.fn(() => true);
});

const pressCalculate = () => fireEvent.press(screen.getByText('Calculate TEI'));

describe('breakdown calculator — rendering', () => {
  it('renders its title and every variable row', () => {
    renderCalc(<BreakdownCalculator />);

    expect(
      screen.getByText(`${CALCULATOR_LABELS.breakdown} Session`),
    ).toBeTruthy();
    for (const label of RING_LABELS) {
      expect(screen.getByText(label)).toBeTruthy();
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
  });

  it('shows exactly the variables CALCULATOR_FIELDS.breakdown lists', () => {
    expect(CALCULATOR_FIELDS.breakdown).toEqual([
      'sets',
      'breakdowns',
      'restSeconds',
      'exertionPercent',
      'cardioMinutes',
    ]);
    renderCalc(<BreakdownCalculator />);
    expect(screen.getAllByLabelText(/.*/).length).toBeGreaterThan(0);
    // No variables belonging to the other calculators leak in.
    expect(screen.queryByText('Exercises')).toBeNull();
    expect(screen.queryByText('Circuits')).toBeNull();
    expect(screen.queryByText('Yoga Mins')).toBeNull();
  });

  it('does not crash with an empty session and leaves every ring blank', () => {
    renderCalc(<BreakdownCalculator />);
    for (const label of RING_LABELS) {
      expect(screen.getByLabelText(label).props.value).toBe('');
    }
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('keeps Calculate disabled until all five variables are set', () => {
    const { store } = renderCalc(<BreakdownCalculator />);
    expect(screen.getByText('Calculate TEI').props.style.color).toBe('#5A5A5A');

    store.seed({ ...REFERENCE, cardioMinutes: null });
    expect(screen.getByText('Calculate TEI').props.style.color).toBe('#5A5A5A');

    store.set('cardioMinutes', 41);
    expect(screen.getByText('Calculate TEI').props.style.color).toBe(
      colors.orange,
    );
  });

  it('treats 0 as a real value, not "unset"', () => {
    renderCalc(<BreakdownCalculator />, {
      seed: { ...REFERENCE, cardioMinutes: 0 },
    });
    expect(screen.getByText('Calculate TEI').props.style.color).toBe(
      colors.orange,
    );
  });
});

describe('breakdown calculator — TEI agrees with the engine', () => {
  const cases: Array<[string, typeof REFERENCE]> = [
    ['reference case', REFERENCE],
    ['no cardio', { ...REFERENCE, cardioMinutes: 0 }],
    ['single breakdown', { ...REFERENCE, breakdowns: 1 }],
    ['heavy load', {
      sets: 40, breakdowns: 5, restSeconds: 30, exertionPercent: 100, cardioMinutes: 61,
    }],
    ['interpolated rest', {
      sets: 9, breakdowns: 3, restSeconds: 75, exertionPercent: 65, cardioMinutes: 30,
    }],
  ];

  it.each(cases)('%s', (_name, inputs) => {
    renderCalc(<BreakdownCalculator />, { seed: inputs });
    pressCalculate();

    expect(
      screen.getByText(String(displayTei(calculateBreakdownTei(inputs).tei))),
    ).toBeTruthy();
  });

  it('multiplies exertion INSIDE the 0.06 product, unlike the Standard model', () => {
    // Guard against the two formulas being conflated: at these inputs the two
    // engines disagree, and the screen must follow the Breakdown one.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { calculateTei } = require('../../src/lib/tei');
    const breakdownTei = calculateBreakdownTei(REFERENCE).tei;
    const standardTei = calculateTei(REFERENCE).tei;
    expect(displayTei(breakdownTei)).not.toBe(displayTei(standardTei));

    renderCalc(<BreakdownCalculator />, { seed: REFERENCE });
    pressCalculate();
    expect(screen.getByText(String(displayTei(breakdownTei)))).toBeTruthy();
  });

  it('folds typed ring input into the score', () => {
    const { store } = renderCalc(<BreakdownCalculator />, {
      seed: { ...REFERENCE, breakdowns: null },
    });

    fireEvent.changeText(screen.getByLabelText('Breakdowns'), '2');
    expect(store.current().breakdowns).toBe(2);

    pressCalculate();
    expect(
      screen.getByText(String(displayTei(calculateBreakdownTei(REFERENCE).tei))),
    ).toBeTruthy();
  });

  it('warns when the score passes the implausible threshold', () => {
    const heavy = {
      sets: 44,
      breakdowns: 5,
      restSeconds: 30,
      exertionPercent: 100,
      cardioMinutes: 61,
    };
    const tei = calculateBreakdownTei(heavy).tei;
    expect(tei).toBeGreaterThan(LIMITS.tei.implausibleAbove);

    const { store } = renderCalc(<BreakdownCalculator />, { seed: heavy });
    pressCalculate();

    expect(store.toast()).toBe(
      `TEI ${tei.toFixed(0)} is beyond a survivable workload — you may need to review how you are defining your data.`,
    );
  });
});

describe('breakdown calculator — ring ranges and over-range arcs', () => {
  /** The arc turns red once value > overAt; find those arc segments. */
  function redArcs() {
    return screen.UNSAFE_root
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      .findAllByType(require('react-native').View)
      .filter(
        (n: { props: { style?: { borderTopColor?: string } } }) =>
          n.props.style?.borderTopColor === colors.red,
      );
  }

  it.each([
    ['Sets', LIMITS.sets.overAt],
    ['Breakdowns', LIMITS.breakdowns.overAt],
    ['Minutes', LIMITS.cardio.overAt],
  ])('%s turns its arc red above %i', (label, overAt) => {
    const { store } = renderCalc(<BreakdownCalculator />, { seed: REFERENCE });
    const field = {
      Sets: 'sets',
      Breakdowns: 'breakdowns',
      Minutes: 'cardioMinutes',
    }[label as 'Sets' | 'Breakdowns' | 'Minutes'] as
      | 'sets'
      | 'breakdowns'
      | 'cardioMinutes';

    store.set(field, overAt);
    const before = redArcs().length;

    store.set(field, overAt + 1);
    expect(redArcs().length).toBeGreaterThan(before);
  });

  // The Seconds ring flags a dangerously short rest, matching
  // app/calculator.tsx and CONFIG.rest on the guided entry screen.
  it('the Seconds ring turns red for a short rest, but not for the unset 0', () => {
    const { store } = renderCalc(<BreakdownCalculator />, { seed: REFERENCE });
    const before = redArcs().length;

    store.set('restSeconds', LIMITS.rest.underAt - 1);
    expect(redArcs().length).toBeGreaterThan(before);

    // 0 means "not entered yet" / the zero-fill of a cardio-only session.
    store.set('restSeconds', 0);
    expect(redArcs().length).toBe(before);
  });

  // Exertion's valid band is 50-100, so either side of it is out of range.
  it('the % Exert ring turns red outside the 50-100 band', () => {
    const { store } = renderCalc(<BreakdownCalculator />, { seed: REFERENCE });
    const before = redArcs().length;

    store.set('exertionPercent', LIMITS.exertion.max + 1);
    expect(redArcs().length).toBeGreaterThan(before);

    store.set('exertionPercent', LIMITS.exertion.min - 1);
    expect(redArcs().length).toBeGreaterThan(before);

    store.set('exertionPercent', LIMITS.exertion.min);
    expect(redArcs().length).toBe(before);
  });

  // Nothing on this screen used to block or flag an out-of-range entry —
  // LIMITS.breakdowns.max is 5, yet 50 was folded into the TEI. CalcShell now
  // bounds-checks before it computes.
  it('blocks out-of-range values instead of scoring them', () => {
    const bogus = { ...REFERENCE, breakdowns: 50, sets: 500 };
    renderCalc(<BreakdownCalculator />, { seed: bogus });

    pressCalculate();

    // `sets` comes first in CALCULATOR_FIELDS.breakdown, so it is reported.
    expect(
      screen.getByText(
        `Sets must be between ${LIMITS.sets.min} and ${LIMITS.sets.max}.`,
      ),
    ).toBeTruthy();
    expect(
      screen.queryByText(String(displayTei(calculateBreakdownTei(bogus).tei))),
    ).toBeNull();
  });
});

describe('breakdown calculator — navigation', () => {
  it('routes every ellipsis to its guided entry screen, tagged from=breakdown', () => {
    renderCalc(<BreakdownCalculator />);

    const expected: Array<[string, string]> = [
      ['More about Sets', '/entry/sets?from=breakdown'],
      ['More about Breakdowns', '/entry/breakdowns?from=breakdown'],
      ['More about Seconds', '/entry/rest?from=breakdown'],
      ['More about % Exert', '/entry/exertion?from=breakdown'],
      ['More about Minutes', '/entry/cardio?from=breakdown'],
    ];

    for (const [label, route] of expected) {
      (router.push as jest.Mock).mockClear();
      fireEvent.press(screen.getByLabelText(label));
      expect(router.push).toHaveBeenCalledWith(route);
    }
  });
});

describe('breakdown calculator — save', () => {
  it('persists with calculator="breakdown" and the breakdown-specific fields', async () => {
    renderCalc(<BreakdownCalculator />, { seed: REFERENCE });

    pressCalculate();
    fireEvent.press(screen.getByText('SAVE'));

    await new Promise((r) => setImmediate(r));
    expect(saveSession).toHaveBeenCalledWith(
      expect.objectContaining({
        calculator: 'breakdown',
        ...REFERENCE,
        tei: Number(calculateBreakdownTei(REFERENCE).tei.toFixed(2)),
        exercises: null,
        circuits: null,
        yogaMinutes: null,
      }),
    );
  });
});
