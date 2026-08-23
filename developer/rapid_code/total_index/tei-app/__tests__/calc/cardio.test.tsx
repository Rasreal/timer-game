/**
 * app/calc/cardio.tsx — PREMIUM Cardio ONLY Training calculator.
 *
 * The simplest of the five: one ring, and TEI = plotted cardio value x 10.
 */
import { fireEvent, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import CardioCalculator from '../../app/calc/cardio';
import {
  CALCULATOR_FIELDS,
  CALCULATOR_LABELS,
  CARDIO_DATASET,
  LIMITS,
  calculateCardioTei,
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

describe('cardio calculator — rendering', () => {
  it('renders its title and its single variable row', () => {
    renderCalc(<CardioCalculator />);

    expect(screen.getByText(`${CALCULATOR_LABELS.cardio} Session`)).toBeTruthy();
    expect(screen.getByText('Minutes')).toBeTruthy();
    expect(screen.getByLabelText('Minutes')).toBeTruthy();
  });

  it('shows exactly the variables CALCULATOR_FIELDS.cardio lists', () => {
    expect(CALCULATOR_FIELDS.cardio).toEqual(['cardioMinutes']);
    renderCalc(<CardioCalculator />);

    for (const other of ['Sets', 'Seconds', '% Exert', 'Breakdowns', 'Circuits', 'Yoga Mins']) {
      expect(screen.queryByText(other)).toBeNull();
    }
  });

  it('does not crash with an empty session', () => {
    renderCalc(<CardioCalculator />);
    expect(screen.getByLabelText('Minutes').props.value).toBe('');
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('keeps Calculate disabled until cardio has a value', () => {
    const { store } = renderCalc(<CardioCalculator />);
    expect(screen.getByText('Calculate TEI').props.style.color).toBe('#5A5A5A');

    store.set('cardioMinutes', 41);
    expect(screen.getByText('Calculate TEI').props.style.color).toBe(
      colors.orange,
    );
  });
});

describe('cardio calculator — TEI agrees with the engine', () => {
  // The 5-minute row sits below LIMITS.cardio.min (7), so the screen now
  // refuses it — it is covered by the floor tests below instead.
  it.each(
    CARDIO_DATASET.map(([minutes]) => minutes).filter(
      (m) => m >= LIMITS.cardio.min && m <= LIMITS.cardio.max,
    ),
  )(
    'scores %i minutes (an exact dataset row) as the engine does',
    (minutes) => {
      renderCalc(<CardioCalculator />, { seed: { cardioMinutes: minutes } });
      pressCalculate();

      const expected = displayTei(calculateCardioTei({ cardioMinutes: minutes }).tei);
      expect(screen.getByText(String(expected))).toBeTruthy();
    },
  );

  // 300 was dropped: it is above LIMITS.cardio.max (150) and is now blocked.
  it.each([9, 30, 55, 70, 100, 140, 150])(
    'scores %i minutes (interpolated or clamped) as the engine does',
    (minutes) => {
      renderCalc(<CardioCalculator />, { seed: { cardioMinutes: minutes } });
      pressCalculate();

      const expected = displayTei(calculateCardioTei({ cardioMinutes: minutes }).tei);
      expect(screen.getByText(String(expected))).toBeTruthy();
    },
  );

  it('folds typed ring input into the score', () => {
    const { store } = renderCalc(<CardioCalculator />);

    fireEvent.changeText(screen.getByLabelText('Minutes'), '61');
    expect(store.current().cardioMinutes).toBe(61);

    pressCalculate();
    expect(
      screen.getByText(
        String(displayTei(calculateCardioTei({ cardioMinutes: 61 }).tei)),
      ),
    ).toBeTruthy();
  });

  it('never reaches the implausible threshold — the cardio ceiling is 12.5 TEI', () => {
    const peak = Math.max(...CARDIO_DATASET.map(([, y]) => y)) * 10;
    expect(peak).toBeLessThan(LIMITS.tei.implausibleAbove);

    const { store } = renderCalc(<CardioCalculator />, {
      seed: { cardioMinutes: 61 },
    });
    pressCalculate();
    expect(store.toast()).toBeNull();
  });
});

describe('cardio calculator — 0 is valid, 1-6 is not per LIMITS.cardio', () => {
  it('accepts 0 as "no cardio" and scores it as 0', () => {
    expect(LIMITS.cardio.allowsZero).toBe(true);
    renderCalc(<CardioCalculator />, { seed: { cardioMinutes: 0 } });

    // 0 counts as complete: the CTA is live.
    expect(screen.getByText('Calculate TEI').props.style.color).toBe(
      colors.orange,
    );

    pressCalculate();
    expect(calculateCardioTei({ cardioMinutes: 0 }).tei).toBe(0);
    expect(screen.getByText('0')).toBeTruthy();
  });

  /** The copy CalcShell renders for an out-of-range cardio entry. */
  const CARDIO_ERROR = `Minutes must be 0 for no cardio, or between ${LIMITS.cardio.min} and ${LIMITS.cardio.max}.`;

  // LIMITS.cardio.min is 7 and any non-zero entry must clear it. This screen
  // used to pass min/max to ProgressRing for the ARC only and never validate,
  // so 1-6 minutes calculated and saved silently.
  it.each([1, 3, 6])(
    '%i minutes (below the 7-minute floor) is blocked, not scored',
    (minutes) => {
      renderCalc(<CardioCalculator />, { seed: { cardioMinutes: minutes } });

      expect(screen.getByText('Calculate TEI').props.style.color).toBe(
        colors.orange,
      );

      pressCalculate();
      expect(screen.getByText(CARDIO_ERROR)).toBeTruthy();
      expect(
        screen.queryByText(
          String(displayTei(calculateCardioTei({ cardioMinutes: minutes }).tei)),
        ),
      ).toBeNull();
    },
  );

  it('blocks a value above LIMITS.cardio.max', () => {
    const minutes = LIMITS.cardio.max + 100;
    renderCalc(<CardioCalculator />, { seed: { cardioMinutes: minutes } });
    pressCalculate();

    expect(screen.getByText(CARDIO_ERROR)).toBeTruthy();
    // Nothing was computed: the score stays on its un-calculated placeholder
    // and the target bar stays empty. (A score assertion would be ambiguous
    // here — this far past the dataset the engine rounds to 0 too.)
    expect(screen.getByText('0')).toBeTruthy();
    expect(screen.getByText('0%')).toBeTruthy();
  });

  it(`turns the arc red above LIMITS.cardio.overAt (${LIMITS.cardio.overAt})`, () => {
    const { store } = renderCalc(<CardioCalculator />, {
      seed: { cardioMinutes: LIMITS.cardio.overAt },
    });
    expect(redArcs()).toHaveLength(0);

    store.set('cardioMinutes', LIMITS.cardio.overAt + 1);
    expect(redArcs().length).toBeGreaterThan(0);
  });
});

describe('cardio calculator — navigation and save', () => {
  it('routes the ellipsis to the guided cardio screen, tagged from=cardio', () => {
    renderCalc(<CardioCalculator />);
    fireEvent.press(screen.getByLabelText('More about Minutes'));
    expect(router.push).toHaveBeenCalledWith('/entry/cardio?from=cardio');
  });

  it('persists with calculator="cardio" and nulls every other variable', async () => {
    renderCalc(<CardioCalculator />, { seed: { cardioMinutes: 41 } });

    pressCalculate();
    fireEvent.press(screen.getByText('SAVE'));

    await new Promise((r) => setImmediate(r));
    expect(saveSession).toHaveBeenCalledWith(
      expect.objectContaining({
        calculator: 'cardio',
        cardioMinutes: 41,
        tei: Number(calculateCardioTei({ cardioMinutes: 41 }).tei.toFixed(2)),
        sets: null,
        restSeconds: null,
        exertionPercent: null,
        breakdowns: null,
        exercises: null,
        circuits: null,
        yogaMinutes: null,
      }),
    );
  });
});
