/**
 * app/entry/[variable].tsx — the orange guided data-entry screen.
 *
 * One route drives all eight variables; the tests below walk every id, check
 * the LIMITS bounds it advertises, and confirm that saving writes the store
 * and navigates back to the calculator that sent the user here.
 */
import { fireEvent, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import VariableEntry from '../../app/entry/[variable]';
import { CALCULATOR_FIELDS, LIMITS } from '../../src/lib/tei';
import { colors } from '../../src/theme';
import { renderCalc } from '../helpers/calcRender';

jest.mock('../../src/lib/supabase', () => ({ supabase: {} }));
jest.mock('../../src/auth', () => ({ useAuth: jest.fn(() => ({ profile: null })) }));

/** Route param -> the SessionDraft field it writes. */
const VARIABLES = {
  sets: 'sets',
  rest: 'restSeconds',
  exertion: 'exertionPercent',
  cardio: 'cardioMinutes',
  breakdowns: 'breakdowns',
  exercises: 'exercises',
  circuits: 'circuits',
  yoga: 'yogaMinutes',
} as const;

type RouteKey = keyof typeof VARIABLES;

const HEADINGS: Record<RouteKey, string> = {
  sets: 'Total Strength Training Sets',
  rest: 'Average Rest Period',
  exertion:
    'Average % Perceived Exertion for Each Set of Strength Training',
  cardio: 'Total Cardio Volume',
  breakdowns: 'Average Number of Breakdowns per Set',
  exercises: 'Average Number of Exercises per Circuit',
  circuits: 'Total Number of Circuits',
  yoga: 'Total Number of Minutes of YOGA',
};

const RING_LABELS: Record<RouteKey, string> = {
  sets: 'Sets',
  rest: 'Seconds',
  exertion: '% Exert',
  cardio: 'Minutes',
  breakdowns: 'Breakdowns',
  exercises: 'Exercises',
  circuits: 'Circuits',
  yoga: 'Yoga Mins',
};

const CTAS: Record<RouteKey, string> = {
  sets: 'Add SETS to TEI',
  rest: 'Add REST to TEI',
  exertion: 'Add EXERTION to TEI',
  cardio: 'Add CARDIO to TEI',
  breakdowns: 'Add BREAKDOWNS to TEI',
  exercises: 'Add EXERCISES to TEI',
  circuits: 'Add CIRCUITS to TEI',
  yoga: 'Add YOGA to TEI',
};

const ROUTE_KEYS = Object.keys(VARIABLES) as RouteKey[];

function openEntry(variable: string, from?: string) {
  (useLocalSearchParams as jest.Mock).mockReturnValue(
    from ? { variable, from } : { variable },
  );
  return renderCalc(<VariableEntry />);
}

function type(variable: RouteKey, text: string) {
  fireEvent.changeText(screen.getByLabelText(RING_LABELS[variable]), text);
}

function redGradients() {
  return screen.UNSAFE_root
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    .findAllByType(require('expo-linear-gradient').LinearGradient)
    .filter(
      (n: { props: { colors?: string[] } }) =>
        n.props.colors?.[0] === 'rgba(255,34,34,0.85)',
    );
}

describe('entry — renders for every variable', () => {
  it.each(ROUTE_KEYS)('renders the %s screen', (key) => {
    openEntry(key);

    expect(screen.getByText(HEADINGS[key])).toBeTruthy();
    expect(screen.getByText(RING_LABELS[key])).toBeTruthy();
    expect(screen.getByLabelText(RING_LABELS[key])).toBeTruthy();
    expect(screen.getByText(CTAS[key])).toBeTruthy();
  });

  it.each(ROUTE_KEYS)('accepts typed input on the %s screen', (key) => {
    openEntry(key);

    // A value every variable's range accepts.
    type(key, key === 'exertion' ? '80' : key === 'rest' ? '60' : '5');
    expect(screen.getByLabelText(RING_LABELS[key]).props.value).toBe(
      key === 'exertion' ? '80' : key === 'rest' ? '60' : '5',
    );
  });

  it('opens the exertion screen pre-set to 75 because it leads with a slider', () => {
    openEntry('exertion');
    expect(screen.getByLabelText('% Exert').props.value).toBe('75');
    expect(
      screen.getByLabelText('Average percent perceived exertion'),
    ).toBeTruthy();
  });

  it.each(ROUTE_KEYS.filter((k) => k !== 'exertion'))(
    'opens the %s screen empty',
    (key) => {
      openEntry(key);
      expect(screen.getByLabelText(RING_LABELS[key]).props.value).toBe('');
    },
  );

  it('pre-fills from a value already in the store', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ variable: 'sets' });
    renderCalc(<VariableEntry />, { seed: { sets: 17 }, seedBeforeMount: true });
    expect(screen.getByLabelText('Sets').props.value).toBe('17');
  });

  it('does not crash on an unset session', () => {
    expect(() => openEntry('cardio')).not.toThrow();
    expect(screen.getByLabelText('Minutes').props.value).toBe('');
  });

  it('shows an "Unknown Variable" state for an unknown variable id', () => {
    openEntry('not-a-variable');
    // No silent fallback to the SETS screen — the bad id is named on screen.
    expect(screen.queryByText(HEADINGS.sets)).toBeNull();
    expect(screen.getByText('Unknown Variable')).toBeTruthy();
    expect(screen.getByText(/not-a-variable/)).toBeTruthy();
  });

  it('shows the "Unknown Variable" state when no variable param is present', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    renderCalc(<VariableEntry />);
    expect(screen.queryByText(HEADINGS.sets)).toBeNull();
    expect(screen.getByText('Unknown Variable')).toBeTruthy();
  });

  it('routes back out of the "Unknown Variable" state', () => {
    openEntry('not-a-variable');
    fireEvent.press(screen.getByText('Go Back'));
    expect(router.replace).toHaveBeenCalledWith('/calculator');
  });

  // `CALCULATOR_FIELDS` names its variables restSeconds / exertionPercent /
  // cardioMinutes / yogaMinutes, but this route's CONFIG is keyed rest /
  // exertion / cardio / yoga. That mismatch used to fall through to `sets`,
  // so /entry/restSeconds rendered the SETS screen and wrote the user's rest
  // value into `sets`. It now fails visibly and writes nothing.
  it.each(['restSeconds', 'exertionPercent', 'cardioMinutes', 'yogaMinutes'])(
    '/entry/%s (CALCULATOR_FIELDS spelling) is rejected rather than mis-writing sets',
    (fieldName) => {
      // The name really is one CALCULATOR_FIELDS advertises.
      expect(
        Object.values(CALCULATOR_FIELDS).some((f) => f.includes(fieldName)),
      ).toBe(true);

      const { store } = openEntry(fieldName);

      expect(screen.queryByText(HEADINGS.sets)).toBeNull();
      expect(screen.getByText('Unknown Variable')).toBeTruthy();
      // No ring to type into, and nothing lands in the draft.
      expect(screen.queryByLabelText('Sets')).toBeNull();
      expect(store.current().sets).toBeNull();
      expect(store.current().restSeconds).toBeNull();
    },
  );
});

describe('entry — LIMITS enforcement (validate blocks the CTA)', () => {
  /** [route key, LIMITS entry, the exact error copy the screen renders]. */
  const VALIDATED: Array<[RouteKey, { min: number; max: number }, string]> = [
    ['sets', LIMITS.sets, `Enter a number between ${LIMITS.sets.min} and ${LIMITS.sets.max}.`],
    ['rest', LIMITS.rest, `Enter a number between ${LIMITS.rest.min} and ${LIMITS.rest.max}.`],
    ['exertion', LIMITS.exertion, 'Please enter a number between 50 and 100.'],
    ['breakdowns', LIMITS.breakdowns, `Enter a number between ${LIMITS.breakdowns.min} and ${LIMITS.breakdowns.max}.`],
    ['exercises', LIMITS.exercises, `Enter a number between ${LIMITS.exercises.min} and ${LIMITS.exercises.max}.`],
    ['circuits', LIMITS.circuits, `Enter a number between ${LIMITS.circuits.min} and ${LIMITS.circuits.max}.`],
    ['yoga', LIMITS.yogaMinutes, `Enter a number between ${LIMITS.yogaMinutes.min} and ${LIMITS.yogaMinutes.max}.`],
  ];

  it.each(VALIDATED)('flags %s below its minimum', (key, limits, message) => {
    const { store } = openEntry(key);

    type(key, String(limits.min - 1));
    expect(screen.getByText(message)).toBeTruthy();

    // The CTA is disabled — pressing it neither stores nor navigates.
    fireEvent.press(screen.getByText(CTAS[key]));
    expect(store.current()[VARIABLES[key]]).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it.each(VALIDATED)('flags %s above its maximum', (key, limits, message) => {
    const { store } = openEntry(key);

    type(key, String(limits.max + 1));
    expect(screen.getByText(message)).toBeTruthy();

    fireEvent.press(screen.getByText(CTAS[key]));
    expect(store.current()[VARIABLES[key]]).toBeNull();
  });

  it.each(VALIDATED)('accepts %s exactly at its minimum and maximum', (key, limits) => {
    for (const boundary of [limits.min, limits.max]) {
      const { store, unmount } = openEntry(key);
      type(key, String(boundary));
      expect(screen.queryByText(/^(Enter|Please enter) a number between/)).toBeNull();

      fireEvent.press(screen.getByText(CTAS[key]));
      expect(store.current()[VARIABLES[key]]).toBe(boundary);
      unmount();
    }
  });

  it('the sets screen blocks a wildly out-of-range value', () => {
    // LIMITS.sets is 1..44; CONFIG.sets now validates as well as flagging.
    const { store } = openEntry('sets');

    type('sets', '500');
    expect(
      screen.getByText(
        `Enter a number between ${LIMITS.sets.min} and ${LIMITS.sets.max}.`,
      ),
    ).toBeTruthy();

    fireEvent.press(screen.getByText(CTAS.sets));
    expect(store.current().sets).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('rejects sets of 0, below LIMITS.sets.min of 1', () => {
    const { store } = openEntry('sets');
    type('sets', '0');
    expect(
      screen.getByText(
        `Enter a number between ${LIMITS.sets.min} and ${LIMITS.sets.max}.`,
      ),
    ).toBeTruthy();
    fireEvent.press(screen.getByText(CTAS.sets));
    expect(store.current().sets).toBeNull();
  });
});

describe('entry — cardio 0 is valid, 1-6 is flagged', () => {
  const CARDIO_ERROR = `Enter 0 for no cardio, or ${LIMITS.cardio.min}-${LIMITS.cardio.max} minutes.`;

  it('accepts 0 as "no cardio" and saves it', () => {
    expect(LIMITS.cardio.allowsZero).toBe(true);
    const { store } = openEntry('cardio');

    type('cardio', '0');
    expect(screen.queryByText(CARDIO_ERROR)).toBeNull();

    fireEvent.press(screen.getByText(CTAS.cardio));
    expect(store.current().cardioMinutes).toBe(0);
  });

  it.each([1, 2, 3, 4, 5, 6])('flags %i minutes, below the 7-minute floor', (minutes) => {
    const { store } = openEntry('cardio');

    type('cardio', String(minutes));
    expect(screen.getByText(CARDIO_ERROR)).toBeTruthy();

    fireEvent.press(screen.getByText(CTAS.cardio));
    expect(store.current().cardioMinutes).toBeNull();
  });

  it(`accepts ${LIMITS.cardio.min}, the first legal non-zero value`, () => {
    const { store } = openEntry('cardio');
    type('cardio', String(LIMITS.cardio.min));
    expect(screen.queryByText(CARDIO_ERROR)).toBeNull();

    fireEvent.press(screen.getByText(CTAS.cardio));
    expect(store.current().cardioMinutes).toBe(LIMITS.cardio.min);
  });

  it(`rejects ${LIMITS.cardio.max + 1}, above the ceiling`, () => {
    const { store } = openEntry('cardio');
    type('cardio', String(LIMITS.cardio.max + 1));
    expect(screen.getByText(CARDIO_ERROR)).toBeTruthy();
    fireEvent.press(screen.getByText(CTAS.cardio));
    expect(store.current().cardioMinutes).toBeNull();
  });
});

describe('entry — over-range visual state', () => {
  /** [route key, the value that must trip the red gradient]. */
  const OVER: Array<[RouteKey, number, number]> = [
    ['sets', LIMITS.sets.overAt, LIMITS.sets.overAt + 1],
    ['cardio', LIMITS.cardio.overAt, LIMITS.cardio.overAt + 1],
    ['breakdowns', LIMITS.breakdowns.overAt, LIMITS.breakdowns.overAt + 1],
    ['exercises', LIMITS.exercises.overAt, LIMITS.exercises.overAt + 1],
    ['circuits', LIMITS.circuits.overAt, LIMITS.circuits.overAt + 1],
    ['yoga', LIMITS.yogaMinutes.overAt, LIMITS.yogaMinutes.overAt + 1],
  ];

  it.each(OVER)(
    '%s: no gradient at %i, red gradient at %i',
    (key, atThreshold, overThreshold) => {
      openEntry(key);

      type(key, String(atThreshold));
      expect(redGradients()).toHaveLength(0);

      type(key, String(overThreshold));
      expect(redGradients()).toHaveLength(1);
    },
  );

  it('rest flags a genuinely short rest but not the unset 0', () => {
    openEntry('rest');

    type('rest', '0');
    expect(redGradients()).toHaveLength(0);

    type('rest', String(LIMITS.rest.min - 1));
    expect(redGradients()).toHaveLength(1);

    type('rest', String(LIMITS.rest.min));
    expect(redGradients()).toHaveLength(0);
  });

  it('the exertion screen reddens the ring outside the 50-100 band', () => {
    openEntry('exertion');

    type('exertion', String(LIMITS.exertion.max + 1));
    expect(screen.getByText('Please enter a number between 50 and 100.')).toBeTruthy();
    expect(redGradients()).toHaveLength(1);

    type('exertion', String(LIMITS.exertion.min - 1));
    expect(redGradients()).toHaveLength(1);

    type('exertion', String(LIMITS.exertion.min));
    expect(redGradients()).toHaveLength(0);
  });

  it('the over-range gradient and the validation error can appear together', () => {
    openEntry('yoga');
    type('yoga', String(LIMITS.yogaMinutes.max + 10));

    expect(redGradients()).toHaveLength(1);
    expect(
      screen.getByText(
        `Enter a number between ${LIMITS.yogaMinutes.min} and ${LIMITS.yogaMinutes.max}.`,
      ),
    ).toBeTruthy();
  });
});

describe('entry — save writes the store and navigates back', () => {
  /** A legal value for each variable. */
  const GOOD: Record<RouteKey, number> = {
    sets: 12,
    rest: 90,
    exertion: 85,
    cardio: 41,
    breakdowns: 2,
    exercises: 5,
    circuits: 4,
    yoga: 53,
  };

  it.each(ROUTE_KEYS)('%s saves and returns to /calculator by default', (key) => {
    const { store } = openEntry(key);

    type(key, String(GOOD[key]));
    fireEvent.press(screen.getByText(CTAS[key]));

    expect(store.current()[VARIABLES[key]]).toBe(GOOD[key]);
    expect(router.replace).toHaveBeenCalled();
  });

  it.each([
    ['standard', '/calculator'],
    ['breakdown', '/calc/breakdown'],
    ['circuit', '/calc/circuit'],
    ['cardio', '/calc/cardio'],
    ['yoga', '/calc/yoga'],
  ])('?from=%s returns to %s', (from, route) => {
    openEntry('cardio', from);

    type('cardio', '41');
    fireEvent.press(screen.getByText(CTAS.cardio));

    expect(router.replace).toHaveBeenCalledWith(route);
  });

  it('an unknown ?from= falls back to the variable\'s own owning calculator', () => {
    openEntry('breakdowns', 'nonsense');
    type('breakdowns', '2');
    fireEvent.press(screen.getByText(CTAS.breakdowns));
    expect(router.replace).toHaveBeenCalledWith('/calc/breakdown');
  });

  it.each([
    ['breakdowns', '/calc/breakdown', 2],
    ['exercises', '/calc/circuit', 5],
    ['circuits', '/calc/circuit', 4],
    ['yoga', '/calc/yoga', 53],
  ] as Array<[RouteKey, string, number]>)(
    '%s infers its owning calculator with no ?from=',
    (key, route, value) => {
      openEntry(key);
      type(key, String(value));
      fireEvent.press(screen.getByText(CTAS[key]));
      expect(router.replace).toHaveBeenCalledWith(route);
    },
  );

  it('the back arrow returns to the same place as a save', () => {
    openEntry('exertion', 'yoga');
    fireEvent.press(screen.getByLabelText('Back'));
    expect(router.replace).toHaveBeenCalledWith('/calc/yoga');
  });

  it('does nothing when the CTA is pressed with no value entered', () => {
    const { store } = openEntry('sets');

    fireEvent.press(screen.getByText(CTAS.sets));

    expect(store.current().sets).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('renders the CTA disabled until a valid value exists', () => {
    openEntry('cardio');
    expect(screen.getByText(CTAS.cardio).props.style.color).toBe('#6B6B6B');

    type('cardio', '41');
    expect(screen.getByText(CTAS.cardio).props.style.color).toBe(colors.orange);

    type('cardio', '3');
    expect(screen.getByText(CTAS.cardio).props.style.color).toBe('#6B6B6B');
  });
});

describe('entry — preset chips', () => {
  it('offers the rest presets and applies one on tap', () => {
    const { store } = openEntry('rest');

    for (const preset of [30, 60, 90, 120]) {
      expect(screen.getByText(String(preset))).toBeTruthy();
    }
    expect(screen.getByText('- or -')).toBeTruthy();
    expect(
      screen.getByText(
        'Enter any number between 30 and 240\ndirectly into the circle above.',
      ),
    ).toBeTruthy();

    fireEvent.press(screen.getByText('90'));
    expect(screen.getByLabelText('Seconds').props.value).toBe('90');

    fireEvent.press(screen.getByText(CTAS.rest));
    expect(store.current().restSeconds).toBe(90);
  });

  it('offers the yoga presets with their own hint copy', () => {
    openEntry('yoga');

    for (const preset of [15, 30, 60, 90]) {
      expect(screen.getByText(String(preset))).toBeTruthy();
    }
    expect(
      screen.getByText(
        'Enter any number between 4 and 100\ndirectly into the circle above.',
      ),
    ).toBeTruthy();
  });

  it('marks the tapped chip active in green', () => {
    openEntry('rest');
    fireEvent.press(screen.getByText('60'));

    const chip = screen.getByText('60');
    expect(chip.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ color: colors.green }),
      ]),
    );
  });

  it.each(ROUTE_KEYS.filter((k) => k !== 'rest' && k !== 'yoga'))(
    'the %s screen has no preset chips',
    (key) => {
      openEntry(key);
      expect(screen.queryByText('- or -')).toBeNull();
    },
  );
});

describe('entry — helper copy', () => {
  it('shows the cardio worked example', () => {
    openEntry('cardio');
    expect(screen.getByText(/EXAMPLE: 10-minute Warm Up walk/)).toBeTruthy();
  });

  it('shows the breakdowns worked example', () => {
    openEntry('breakdowns');
    expect(screen.getByText(/EXAMPLE: starting with 20 lbs/)).toBeTruthy();
  });

  it.each(['sets', 'rest', 'exertion', 'exercises', 'circuits', 'yoga'] as RouteKey[])(
    'the %s screen carries no worked example',
    (key) => {
      openEntry(key);
      expect(screen.queryByText(/^EXAMPLE:/)).toBeNull();
    },
  );

  it('shows the exertion slider marks', () => {
    openEntry('exertion');
    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByText('75%')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
    expect(screen.getByText('Muscle\nBurning')).toBeTruthy();
  });
});
