/**
 * app/calc/yoga.tsx — PREMIUM YOGA Training calculator.
 */
import { fireEvent, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import YogaCalculator from '../../app/calc/yoga';
import {
  CALCULATOR_FIELDS,
  CALCULATOR_LABELS,
  LIMITS,
  YOGA_DATASET,
  calculateYogaTei,
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

const REFERENCE = { yogaMinutes: 53, exertionPercent: 80, cardioMinutes: 41 };

const RING_LABELS = ['Yoga Mins', '% Exert', 'Minutes'];

beforeEach(() => {
  (useAuth as jest.Mock).mockReturnValue(makeAuth('premium'));
  (useLocalSearchParams as jest.Mock).mockReturnValue({});
  (router as unknown as { canGoBack: jest.Mock }).canGoBack = jest.fn(() => true);
});

const pressCalculate = () => fireEvent.press(screen.getByText('Calculate TEI'));

function redArcs() {
  return screen.UNSAFE_root
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    .findAllByType(require('react-native').View)
    .filter(
      (n: { props: { style?: { borderTopColor?: string } } }) =>
        n.props.style?.borderTopColor === colors.red,
    );
}

describe('yoga calculator — rendering', () => {
  it('renders its title and every variable row', () => {
    renderCalc(<YogaCalculator />);

    expect(screen.getByText(CALCULATOR_LABELS.yoga)).toBeTruthy();
    for (const label of RING_LABELS) {
      expect(screen.getByText(label)).toBeTruthy();
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
  });

  it('is the only calculator carrying the Effective Ranges pill', () => {
    renderCalc(<YogaCalculator />);
    fireEvent.press(screen.getByText('Effective Ranges'));
    expect(router.push).toHaveBeenCalledWith('/ranges');
  });

  it('labels itself without the trailing " Session" the others use', () => {
    renderCalc(<YogaCalculator />);
    expect(screen.getByText('YOGA Training')).toBeTruthy();
    expect(screen.queryByText('YOGA Training Session')).toBeNull();
  });

  it('shows exactly the variables CALCULATOR_FIELDS.yoga lists', () => {
    expect(CALCULATOR_FIELDS.yoga).toEqual([
      'yogaMinutes',
      'exertionPercent',
      'cardioMinutes',
    ]);
    renderCalc(<YogaCalculator />);
    for (const other of ['Sets', 'Seconds', 'Breakdowns', 'Exercises', 'Circuits']) {
      expect(screen.queryByText(other)).toBeNull();
    }
  });

  it('does not crash with an empty session', () => {
    renderCalc(<YogaCalculator />);
    for (const label of RING_LABELS) {
      expect(screen.getByLabelText(label).props.value).toBe('');
    }
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('keeps Calculate disabled until all three variables are set', () => {
    const { store } = renderCalc(<YogaCalculator />);
    expect(screen.getByText('Calculate TEI').props.style.color).toBe('#5A5A5A');

    store.seed({ yogaMinutes: 53, exertionPercent: 80 });
    expect(screen.getByText('Calculate TEI').props.style.color).toBe('#5A5A5A');

    store.set('cardioMinutes', 0);
    expect(screen.getByText('Calculate TEI').props.style.color).toBe(
      colors.orange,
    );
  });
});

describe('yoga calculator — TEI agrees with the engine', () => {
  const cases: Array<[string, typeof REFERENCE]> = [
    ['reference case', REFERENCE],
    ['no cardio', { ...REFERENCE, cardioMinutes: 0 }],
    ['minimum yoga', { yogaMinutes: 4, exertionPercent: 50, cardioMinutes: 0 }],
    ['maximum yoga', { yogaMinutes: 100, exertionPercent: 100, cardioMinutes: 61 }],
    ['interpolated yoga minutes', {
      yogaMinutes: 65, exertionPercent: 72, cardioMinutes: 30,
    }],
  ];

  it.each(cases)('%s', (_name, inputs) => {
    renderCalc(<YogaCalculator />, { seed: inputs });
    pressCalculate();

    expect(
      screen.getByText(String(displayTei(calculateYogaTei(inputs).tei))),
    ).toBeTruthy();
  });

  it.each(YOGA_DATASET.map(([minutes]) => minutes))(
    'scores %i yoga minutes (an exact dataset row) as the engine does',
    (minutes) => {
      const inputs = { ...REFERENCE, yogaMinutes: minutes };
      renderCalc(<YogaCalculator />, { seed: inputs });
      pressCalculate();

      expect(
        screen.getByText(String(displayTei(calculateYogaTei(inputs).tei))),
      ).toBeTruthy();
    },
  );

  it('folds typed ring input into the score', () => {
    const { store } = renderCalc(<YogaCalculator />, {
      seed: { exertionPercent: 80, cardioMinutes: 41 },
    });

    fireEvent.changeText(screen.getByLabelText('Yoga Mins'), '53');
    expect(store.current().yogaMinutes).toBe(53);

    pressCalculate();
    expect(
      screen.getByText(String(displayTei(calculateYogaTei(REFERENCE).tei))),
    ).toBeTruthy();
  });

  it('never reaches the implausible threshold at legal inputs', () => {
    const max = calculateYogaTei({
      yogaMinutes: LIMITS.yogaMinutes.max,
      exertionPercent: LIMITS.exertion.max,
      cardioMinutes: 61,
    }).tei;
    expect(max).toBeLessThan(LIMITS.tei.implausibleAbove);

    const { store } = renderCalc(<YogaCalculator />, {
      seed: { yogaMinutes: 100, exertionPercent: 100, cardioMinutes: 61 },
    });
    pressCalculate();
    expect(store.toast()).toBeNull();
  });
});

describe('yoga calculator — over-range arcs', () => {
  it.each([
    ['Yoga Mins', 'yogaMinutes', LIMITS.yogaMinutes.overAt],
    ['Minutes', 'cardioMinutes', LIMITS.cardio.overAt],
  ] as Array<[string, 'yogaMinutes' | 'cardioMinutes', number]>)(
    '%s turns its arc red above %s',
    (_label, field, overAt) => {
      const { store } = renderCalc(<YogaCalculator />, { seed: REFERENCE });

      store.set(field, overAt);
      const before = redArcs().length;

      store.set(field, overAt + 1);
      expect(redArcs().length).toBeGreaterThan(before);
    },
  );

  // Exertion's valid band is 50-100, so either side of it is out of range.
  it('the % Exert ring turns red outside the 50-100 band', () => {
    const { store } = renderCalc(<YogaCalculator />, { seed: REFERENCE });
    const before = redArcs().length;

    store.set('exertionPercent', LIMITS.exertion.max + 1);
    expect(redArcs().length).toBeGreaterThan(before);

    store.set('exertionPercent', LIMITS.exertion.min - 1);
    expect(redArcs().length).toBeGreaterThan(before);

    store.set('exertionPercent', LIMITS.exertion.min);
    expect(redArcs().length).toBe(before);
  });

  // There used to be no validation on this screen either — LIMITS.yogaMinutes
  // is 4..100 but 400 minutes was accepted and scored (clamped by the dataset
  // to the 100-minute index). CalcShell now blocks it.
  it('blocks out-of-range yoga minutes instead of scoring them', () => {
    const bogus = { ...REFERENCE, yogaMinutes: 400 };
    renderCalc(<YogaCalculator />, { seed: bogus });

    pressCalculate();

    expect(
      screen.getByText(
        `Yoga Mins must be between ${LIMITS.yogaMinutes.min} and ${LIMITS.yogaMinutes.max}.`,
      ),
    ).toBeTruthy();
    expect(
      screen.queryByText(String(displayTei(calculateYogaTei(bogus).tei))),
    ).toBeNull();
  });
});

describe('yoga calculator — navigation', () => {
  it('routes every ellipsis to its guided entry screen, tagged from=yoga', () => {
    renderCalc(<YogaCalculator />);

    const expected: Array<[string, string]> = [
      ['More about Yoga Mins', '/entry/yoga?from=yoga'],
      ['More about % Exert', '/entry/exertion?from=yoga'],
      ['More about Minutes', '/entry/cardio?from=yoga'],
    ];

    for (const [label, route] of expected) {
      (router.push as jest.Mock).mockClear();
      fireEvent.press(screen.getByLabelText(label));
      expect(router.push).toHaveBeenCalledWith(route);
    }
  });

  // DEAD CODE: `guided` in app/calc/yoga.tsx is declared but never used, so
  // its "not wired up yet" stub toast is unreachable.
  it('never surfaces the leftover "not wired up yet" stub toast', () => {
    const { store } = renderCalc(<YogaCalculator />);

    for (const label of RING_LABELS) {
      fireEvent.press(screen.getByLabelText(`More about ${label}`));
    }
    expect(store.toast()).toBeNull();
  });
});

describe('yoga calculator — save', () => {
  it('persists with calculator="yoga" and only its own fields', async () => {
    renderCalc(<YogaCalculator />, { seed: REFERENCE });

    pressCalculate();
    fireEvent.press(screen.getByText('SAVE'));

    await new Promise((r) => setImmediate(r));
    expect(saveSession).toHaveBeenCalledWith(
      expect.objectContaining({
        calculator: 'yoga',
        ...REFERENCE,
        tei: Number(calculateYogaTei(REFERENCE).tei.toFixed(2)),
        sets: null,
        restSeconds: null,
        breakdowns: null,
        exercises: null,
        circuits: null,
      }),
    );
  });
});
