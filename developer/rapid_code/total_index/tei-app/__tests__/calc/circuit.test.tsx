/**
 * app/calc/circuit.tsx — PREMIUM Circuit Strength Training calculator.
 */
import { fireEvent, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import CircuitCalculator from '../../app/calc/circuit';
import {
  CALCULATOR_FIELDS,
  CALCULATOR_LABELS,
  LIMITS,
  calculateCircuitTei,
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
  exercises: 5,
  circuits: 4,
  exertionPercent: 80,
  cardioMinutes: 41,
};

const RING_LABELS = ['Exercises', 'Circuits', '% Exert', 'Minutes'];

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

describe('circuit calculator — rendering', () => {
  it('renders its title and every variable row', () => {
    renderCalc(<CircuitCalculator />);

    expect(screen.getByText(`${CALCULATOR_LABELS.circuit} Session`)).toBeTruthy();
    for (const label of RING_LABELS) {
      expect(screen.getByText(label)).toBeTruthy();
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
  });

  it('shows exactly the variables CALCULATOR_FIELDS.circuit lists', () => {
    expect(CALCULATOR_FIELDS.circuit).toEqual([
      'exercises',
      'circuits',
      'exertionPercent',
      'cardioMinutes',
    ]);
    renderCalc(<CircuitCalculator />);
    // Circuit takes no sets, no rest and no yoga.
    expect(screen.queryByText('Sets')).toBeNull();
    expect(screen.queryByText('Seconds')).toBeNull();
    expect(screen.queryByText('Yoga Mins')).toBeNull();
  });

  it('does not crash with an empty session', () => {
    renderCalc(<CircuitCalculator />);
    for (const label of RING_LABELS) {
      expect(screen.getByLabelText(label).props.value).toBe('');
    }
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('keeps Calculate disabled until all four variables are set', () => {
    const { store } = renderCalc(<CircuitCalculator />);
    expect(screen.getByText('Calculate TEI').props.style.color).toBe('#5A5A5A');

    store.seed({ ...REFERENCE, cardioMinutes: null });
    expect(screen.getByText('Calculate TEI').props.style.color).toBe('#5A5A5A');

    store.set('cardioMinutes', 0);
    expect(screen.getByText('Calculate TEI').props.style.color).toBe(
      colors.orange,
    );
  });
});

describe('circuit calculator — TEI agrees with the engine', () => {
  const cases: Array<[string, typeof REFERENCE]> = [
    ['reference case', REFERENCE],
    ['no cardio', { ...REFERENCE, cardioMinutes: 0 }],
    ['peak exercises and circuits', {
      exercises: 5, circuits: 5, exertionPercent: 100, cardioMinutes: 61,
    }],
    ['past the dataset peak (index falls away)', {
      exercises: 10, circuits: 10, exertionPercent: 80, cardioMinutes: 41,
    }],
    ['minimum entries', {
      exercises: 1, circuits: 1, exertionPercent: 50, cardioMinutes: 0,
    }],
  ];

  it.each(cases)('%s', (_name, inputs) => {
    renderCalc(<CircuitCalculator />, { seed: inputs });
    pressCalculate();

    expect(
      screen.getByText(String(displayTei(calculateCircuitTei(inputs).tei))),
    ).toBeTruthy();
  });

  it('uses BOTH the raw counts and their plotted index values', () => {
    // A pure-count model would keep rising with more circuits; the real one
    // falls away past the dataset peak at 5 circuits.
    const peak = { ...REFERENCE, circuits: 5 };
    const past = { ...REFERENCE, circuits: 10 };
    expect(calculateCircuitTei(past).tei).toBeLessThan(
      calculateCircuitTei(peak).tei,
    );

    renderCalc(<CircuitCalculator />, { seed: past });
    pressCalculate();
    expect(
      screen.getByText(String(displayTei(calculateCircuitTei(past).tei))),
    ).toBeTruthy();
  });

  it('folds typed ring input into the score', () => {
    const { store } = renderCalc(<CircuitCalculator />, {
      seed: { ...REFERENCE, circuits: null },
    });

    fireEvent.changeText(screen.getByLabelText('Circuits'), '4');
    expect(store.current().circuits).toBe(4);

    pressCalculate();
    expect(
      screen.getByText(String(displayTei(calculateCircuitTei(REFERENCE).tei))),
    ).toBeTruthy();
  });
});

describe('circuit calculator — over-range arcs', () => {
  it.each([
    ['Exercises', 'exercises', LIMITS.exercises.overAt],
    ['Circuits', 'circuits', LIMITS.circuits.overAt],
    ['Minutes', 'cardioMinutes', LIMITS.cardio.overAt],
  ] as Array<[string, 'exercises' | 'circuits' | 'cardioMinutes', number]>)(
    '%s turns its arc red above %s',
    (_label, field, overAt) => {
      const { store } = renderCalc(<CircuitCalculator />, { seed: REFERENCE });

      store.set(field, overAt);
      const before = redArcs().length;

      store.set(field, overAt + 1);
      expect(redArcs().length).toBeGreaterThan(before);
    },
  );

  // Exertion's valid band is 50-100, so either side of it is out of range.
  it('the % Exert ring turns red outside the 50-100 band', () => {
    const { store } = renderCalc(<CircuitCalculator />, { seed: REFERENCE });
    const before = redArcs().length;

    store.set('exertionPercent', LIMITS.exertion.max + 1);
    expect(redArcs().length).toBeGreaterThan(before);

    store.set('exertionPercent', LIMITS.exertion.min - 1);
    expect(redArcs().length).toBeGreaterThan(before);

    store.set('exertionPercent', LIMITS.exertion.min);
    expect(redArcs().length).toBe(before);
  });

  // There used to be no validation anywhere on this screen — LIMITS.circuits
  // .max is 10, yet 40 was accepted and scored. CalcShell now bounds-checks
  // every variable the calculator uses before it computes.
  it('blocks out-of-range values instead of scoring them', () => {
    const bogus = { ...REFERENCE, circuits: 40, exercises: 40 };
    renderCalc(<CircuitCalculator />, { seed: bogus });

    pressCalculate();

    expect(
      screen.getByText(
        `Exercises must be between ${LIMITS.exercises.min} and ${LIMITS.exercises.max}.`,
      ),
    ).toBeTruthy();
    expect(
      screen.queryByText(String(displayTei(calculateCircuitTei(bogus).tei))),
    ).toBeNull();
  });
});

describe('circuit calculator — navigation', () => {
  it('routes every ellipsis to its guided entry screen, tagged from=circuit', () => {
    renderCalc(<CircuitCalculator />);

    const expected: Array<[string, string]> = [
      ['More about Exercises', '/entry/exercises?from=circuit'],
      ['More about Circuits', '/entry/circuits?from=circuit'],
      ['More about % Exert', '/entry/exertion?from=circuit'],
      ['More about Minutes', '/entry/cardio?from=circuit'],
    ];

    for (const [label, route] of expected) {
      (router.push as jest.Mock).mockClear();
      fireEvent.press(screen.getByLabelText(label));
      expect(router.push).toHaveBeenCalledWith(route);
    }
  });

  // DEAD CODE: `const guided = () => showToast('Guided entry for this
  // variable is not wired up yet.')` is declared in app/calc/circuit.tsx but
  // never referenced — every ellipsis routes properly. The stub message can
  // never reach the screen.
  it('never surfaces the leftover "not wired up yet" stub toast', () => {
    const { store } = renderCalc(<CircuitCalculator />);

    for (const label of RING_LABELS) {
      fireEvent.press(screen.getByLabelText(`More about ${label}`));
    }
    expect(store.toast()).toBeNull();
  });
});

describe('circuit calculator — save', () => {
  it('persists with calculator="circuit" and only its own fields', async () => {
    renderCalc(<CircuitCalculator />, { seed: REFERENCE });

    pressCalculate();
    fireEvent.press(screen.getByText('SAVE'));

    await new Promise((r) => setImmediate(r));
    expect(saveSession).toHaveBeenCalledWith(
      expect.objectContaining({
        calculator: 'circuit',
        ...REFERENCE,
        tei: Number(calculateCircuitTei(REFERENCE).tei.toFixed(2)),
        sets: null,
        restSeconds: null,
        breakdowns: null,
        yogaMinutes: null,
      }),
    );
  });
});
