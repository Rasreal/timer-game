/**
 * app/session-type.tsx — TEI Premium "5 Types of Training Session Selector".
 *
 * The CTA must route through `resolveCalculator` + `CALCULATOR_ROUTES`, so
 * every combination of the four strength options and the aerobic toggle is
 * checked against the exact expected path.
 */
import { fireEvent, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import SessionType from '../../app/session-type';
import {
  AEROBIC_LABEL,
  CALCULATOR_ROUTES,
  STRENGTH_OPTIONS,
  resolveCalculator,
  type StrengthOption,
} from '../../src/lib/selector';
import { colors } from '../../src/theme';
import { renderCalc } from '../helpers/calcRender';

jest.mock('../../src/lib/supabase', () => ({ supabase: {} }));
jest.mock('../../src/auth', () => ({
  useAuth: jest.fn(() => ({ profile: null })),
}));

beforeEach(() => {
  (useLocalSearchParams as jest.Mock).mockReturnValue({});
});

const LABELS: Record<StrengthOption, string> = {
  standard: 'Standard Strength Training',
  breakdown: 'Breakdown Strength Training',
  circuit: 'Circuit Strength Training',
  yoga: 'YOGA Training (strength option)',
};

const STRENGTH_IDS = STRENGTH_OPTIONS.map((o) => o.id);

const row = (label: string) => screen.getByLabelText(label);
const checked = (label: string) =>
  row(label).props.accessibilityState?.checked === true;
const tap = (label: string) => fireEvent.press(row(label));
const pressCta = () => fireEvent.press(screen.getByText('Go To TEI Calculator'));

describe('session-type — rendering', () => {
  it('renders the heading, instruction and every option row', () => {
    renderCalc(<SessionType />);

    expect(screen.getByText('This Training Session')).toBeTruthy();
    expect(screen.getByText('Type of Training Session')).toBeTruthy();
    expect(screen.getByText('Go To TEI Calculator')).toBeTruthy();

    for (const option of STRENGTH_OPTIONS) {
      expect(row(option.label)).toBeTruthy();
    }
    expect(row(AEROBIC_LABEL)).toBeTruthy();
  });

  it('renders the date and time discs from the session draft', () => {
    renderCalc(<SessionType />);

    expect(screen.getByLabelText(/^Session date, /)).toBeTruthy();
    expect(screen.getByLabelText(/^Session time, /)).toBeTruthy();
  });

  it('starts with nothing selected and the CTA disabled', () => {
    renderCalc(<SessionType />);

    for (const option of STRENGTH_OPTIONS) {
      expect(checked(option.label)).toBe(false);
    }
    expect(checked(AEROBIC_LABEL)).toBe(false);
    expect(screen.getByText('Go To TEI Calculator').props.style.color).toBe(
      '#6B6B6B',
    );

    pressCta();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('does not crash on an unset session draft', () => {
    expect(() => renderCalc(<SessionType />)).not.toThrow();
  });

  it('draws an X only in the checked boxes', () => {
    renderCalc(<SessionType />);
    expect(screen.queryAllByText('X')).toHaveLength(0);

    tap(LABELS.circuit);
    expect(screen.queryAllByText('X')).toHaveLength(1);

    tap(AEROBIC_LABEL);
    expect(screen.queryAllByText('X')).toHaveLength(2);
  });

  it('enables the CTA as soon as anything is selected', () => {
    renderCalc(<SessionType />);
    tap(AEROBIC_LABEL);
    expect(screen.getByText('Go To TEI Calculator').props.style.color).toBe(
      colors.orange,
    );
  });
});

describe('session-type — the four strength options are mutually exclusive', () => {
  it('checking a second strength option unchecks the first', () => {
    renderCalc(<SessionType />);

    tap(LABELS.standard);
    expect(checked(LABELS.standard)).toBe(true);

    tap(LABELS.circuit);
    expect(checked(LABELS.circuit)).toBe(true);
    expect(checked(LABELS.standard)).toBe(false);
  });

  it.each(STRENGTH_IDS)('only %s stays checked when it is picked last', (id) => {
    renderCalc(<SessionType />);

    // Walk every OTHER option, then land on this one, so the final tap is
    // always a fresh selection rather than a toggle-off of the same row.
    for (const other of STRENGTH_IDS) if (other !== id) tap(LABELS[other]);
    tap(LABELS[id]);

    const stillChecked = STRENGTH_IDS.filter((o) => checked(LABELS[o]));
    expect(stillChecked).toEqual([id]);
  });

  it('tapping the checked strength option clears it', () => {
    renderCalc(<SessionType />);

    tap(LABELS.yoga);
    expect(checked(LABELS.yoga)).toBe(true);

    tap(LABELS.yoga);
    expect(checked(LABELS.yoga)).toBe(false);
    expect(screen.getByText('Go To TEI Calculator').props.style.color).toBe(
      '#6B6B6B',
    );
  });
});

describe('session-type — aerobic is an independent toggle', () => {
  it('toggles on and off without touching the strength selection', () => {
    renderCalc(<SessionType />);

    tap(LABELS.breakdown);
    tap(AEROBIC_LABEL);
    expect(checked(AEROBIC_LABEL)).toBe(true);
    expect(checked(LABELS.breakdown)).toBe(true);

    tap(AEROBIC_LABEL);
    expect(checked(AEROBIC_LABEL)).toBe(false);
    expect(checked(LABELS.breakdown)).toBe(true);
  });

  it('survives a change of strength option', () => {
    renderCalc(<SessionType />);

    tap(AEROBIC_LABEL);
    tap(LABELS.standard);
    tap(LABELS.circuit);

    expect(checked(AEROBIC_LABEL)).toBe(true);
    expect(checked(LABELS.circuit)).toBe(true);
  });

  it('a strength option does not clear aerobic and vice versa', () => {
    renderCalc(<SessionType />);

    tap(AEROBIC_LABEL);
    expect(checked(AEROBIC_LABEL)).toBe(true);

    tap(LABELS.yoga);
    tap(LABELS.yoga); // clear the strength pick again
    expect(checked(AEROBIC_LABEL)).toBe(true);
  });
});

describe('session-type — the CTA routes via resolveCalculator + CALCULATOR_ROUTES', () => {
  /** Every combination of (strength | none) x (aerobic on/off). */
  const COMBINATIONS: Array<[StrengthOption | null, boolean, string | null]> = [
    [null, false, null],
    [null, true, '/calc/cardio'],
    ['standard', false, '/calculator'],
    ['standard', true, '/calculator'],
    ['breakdown', false, '/calc/breakdown'],
    ['breakdown', true, '/calc/breakdown'],
    ['circuit', false, '/calc/circuit'],
    ['circuit', true, '/calc/circuit'],
    ['yoga', false, '/calc/yoga'],
    ['yoga', true, '/calc/yoga'],
  ];

  it.each(COMBINATIONS)(
    'strength=%s aerobic=%s -> %s',
    (strength, aerobic, expectedRoute) => {
      // The expectation matches the library the screen is built on.
      const resolved = resolveCalculator({ strength, aerobic });
      expect(resolved === null ? null : CALCULATOR_ROUTES[resolved]).toBe(
        expectedRoute,
      );

      renderCalc(<SessionType />);
      if (strength) tap(LABELS[strength]);
      if (aerobic) tap(AEROBIC_LABEL);

      pressCta();

      if (expectedRoute === null) {
        expect(router.push).not.toHaveBeenCalled();
      } else {
        expect(router.push).toHaveBeenCalledWith(expectedRoute);
      }
    },
  );

  it('a strength pick always wins over aerobic, because it takes cardio too', () => {
    renderCalc(<SessionType />);

    tap(AEROBIC_LABEL);
    tap(LABELS.breakdown);
    pressCta();

    expect(router.push).toHaveBeenCalledWith('/calc/breakdown');
    expect(router.push).not.toHaveBeenCalledWith('/calc/cardio');
  });

  it('aerobic alone opens the Cardio ONLY calculator', () => {
    renderCalc(<SessionType />);

    tap(AEROBIC_LABEL);
    pressCta();

    expect(router.push).toHaveBeenCalledWith(CALCULATOR_ROUTES.cardio);
  });

  it('re-picking before the CTA routes to the latest selection only', () => {
    renderCalc(<SessionType />);

    tap(LABELS.standard);
    tap(LABELS.yoga);
    pressCta();

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/calc/yoga');
  });

  it('CALCULATOR_ROUTES covers every calculator id', () => {
    expect(CALCULATOR_ROUTES).toEqual({
      standard: '/calculator',
      breakdown: '/calc/breakdown',
      circuit: '/calc/circuit',
      cardio: '/calc/cardio',
      yoga: '/calc/yoga',
    });
  });
});

describe('session-type — planner passthrough', () => {
  it.each([
    ['standard', '/calculator?plan=2026-05-01'],
    ['breakdown', '/calc/breakdown?plan=2026-05-01'],
    ['circuit', '/calc/circuit?plan=2026-05-01'],
    ['yoga', '/calc/yoga?plan=2026-05-01'],
  ] as Array<[StrengthOption, string]>)(
    'carries ?plan= through to the %s calculator',
    (strength, expectedRoute) => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({
        plan: '2026-05-01',
      });
      renderCalc(<SessionType />);

      tap(LABELS[strength]);
      pressCta();

      expect(router.push).toHaveBeenCalledWith(expectedRoute);
    },
  );

  it('carries ?plan= through the aerobic-only path too', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ plan: '2026-05-01' });
    renderCalc(<SessionType />);

    tap(AEROBIC_LABEL);
    pressCta();

    expect(router.push).toHaveBeenCalledWith('/calc/cardio?plan=2026-05-01');
  });
});

describe('session-type — navigation and stubs', () => {
  it('the back arrow goes back', () => {
    renderCalc(<SessionType />);
    fireEvent.press(screen.getByLabelText('Back'));
    expect(router.back).toHaveBeenCalled();
  });

  // NOT PORTED: the date/time discs are acknowledged stubs.
  it('the date and time discs only toast that picking is unimplemented', () => {
    const { store } = renderCalc(<SessionType />);

    fireEvent.press(screen.getByLabelText(/^Session date, /));
    expect(store.toast()).toBe('Date picking is not wired up in the prototype.');

    fireEvent.press(screen.getByLabelText(/^Session time, /));
    expect(store.toast()).toBe('Date picking is not wired up in the prototype.');
  });

  // SUSPECTED BUG: the back arrow calls router.back() unconditionally, with no
  // canGoBack() fallback — unlike app/calculator.tsx and app/calc/_shared.tsx,
  // which both guard it. Reached by deep link, this arrow is visibly dead.
  it('SUSPECTED BUG: the back arrow has no canGoBack() fallback', () => {
    (router as unknown as { canGoBack: jest.Mock }).canGoBack = jest.fn(
      () => false,
    );
    renderCalc(<SessionType />);

    fireEvent.press(screen.getByLabelText('Back'));

    expect(router.back).toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
