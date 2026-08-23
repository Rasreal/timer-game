import {
  resolveCalculator,
  CALCULATOR_ROUTES,
  STRENGTH_OPTIONS,
  AEROBIC_LABEL,
  sessionDay,
  sessionMonthYear,
  sessionTime,
  type StrengthOption,
} from '../src/lib/selector';
import type { CalculatorId } from '../src/lib/tei';

const STRENGTHS: StrengthOption[] = [
  'standard',
  'breakdown',
  'circuit',
  'yoga',
];

const ALL_CALCULATORS: CalculatorId[] = [
  'standard',
  'breakdown',
  'circuit',
  'cardio',
  'yoga',
];

describe('resolveCalculator', () => {
  it('returns null when nothing is selected', () => {
    expect(resolveCalculator({ strength: null, aerobic: false })).toBeNull();
  });

  it('returns "cardio" for aerobic alone', () => {
    expect(resolveCalculator({ strength: null, aerobic: true })).toBe('cardio');
  });

  it.each(STRENGTHS)(
    'returns "%s" when that strength option is picked without aerobic',
    (strength) => {
      expect(resolveCalculator({ strength, aerobic: false })).toBe(strength);
    },
  );

  it.each(STRENGTHS)(
    'lets strength "%s" win over the aerobic toggle',
    (strength) => {
      expect(resolveCalculator({ strength, aerobic: true })).toBe(strength);
    },
  );

  it('covers all ten strength x aerobic combinations', () => {
    const strengthCases: (StrengthOption | null)[] = [null, ...STRENGTHS];
    const results = strengthCases.flatMap((strength) =>
      [false, true].map((aerobic) => resolveCalculator({ strength, aerobic })),
    );

    expect(results).toEqual([
      null, // none / none
      'cardio', // none / aerobic
      'standard',
      'standard',
      'breakdown',
      'breakdown',
      'circuit',
      'circuit',
      'yoga',
      'yoga',
    ]);
  });

  it('never resolves to "cardio" when a strength option is set', () => {
    for (const strength of STRENGTHS) {
      expect(resolveCalculator({ strength, aerobic: true })).not.toBe('cardio');
    }
  });
});

describe('CALCULATOR_ROUTES', () => {
  it('has an entry for every CalculatorId', () => {
    for (const id of ALL_CALCULATORS) {
      expect(CALCULATOR_ROUTES[id]).toBeDefined();
      expect(typeof CALCULATOR_ROUTES[id]).toBe('string');
    }
    expect(Object.keys(CALCULATOR_ROUTES).sort()).toEqual(
      [...ALL_CALCULATORS].sort(),
    );
  });

  it('maps each calculator to its exact route', () => {
    expect(CALCULATOR_ROUTES).toEqual({
      standard: '/calculator',
      breakdown: '/calc/breakdown',
      circuit: '/calc/circuit',
      yoga: '/calc/yoga',
      cardio: '/calc/cardio',
    });
  });

  it('gives every calculator a distinct absolute route', () => {
    const routes = Object.values(CALCULATOR_ROUTES);
    expect(new Set(routes).size).toBe(routes.length);
    for (const r of routes) expect(r.startsWith('/')).toBe(true);
  });

  it('routes every resolveCalculator result to a known screen', () => {
    for (const strength of STRENGTHS) {
      const id = resolveCalculator({ strength, aerobic: false })!;
      expect(CALCULATOR_ROUTES[id]).toBeDefined();
    }
    const cardio = resolveCalculator({ strength: null, aerobic: true })!;
    expect(CALCULATOR_ROUTES[cardio]).toBe('/calc/cardio');
  });
});

describe('STRENGTH_OPTIONS / AEROBIC_LABEL', () => {
  it('lists the four strength options in the deck order', () => {
    expect(STRENGTH_OPTIONS.map((o) => o.id)).toEqual([
      'standard',
      'breakdown',
      'circuit',
      'yoga',
    ]);
  });

  it('carries a label for each option', () => {
    expect(STRENGTH_OPTIONS).toEqual([
      { id: 'standard', label: 'Standard Strength Training' },
      { id: 'breakdown', label: 'Breakdown Strength Training' },
      { id: 'circuit', label: 'Circuit Strength Training' },
      { id: 'yoga', label: 'YOGA Training (strength option)' },
    ]);
  });

  it('excludes cardio from the strength list', () => {
    expect(STRENGTH_OPTIONS.map((o) => o.id)).not.toContain('cardio');
    expect(AEROBIC_LABEL).toBe('Aerobic/Cardiovascular Training');
  });
});

describe('sessionDay', () => {
  it('returns the local day of month without padding', () => {
    expect(sessionDay(new Date(2026, 3, 27, 14, 33).toISOString())).toBe('27');
    expect(sessionDay(new Date(2026, 3, 5, 14, 33).toISOString())).toBe('5');
  });

  it('returns the first and last day of a month', () => {
    expect(sessionDay(new Date(2026, 0, 1, 12, 0).toISOString())).toBe('1');
    expect(sessionDay(new Date(2026, 11, 31, 12, 0).toISOString())).toBe('31');
  });
});

describe('sessionMonthYear', () => {
  it('formats as "Month, Year"', () => {
    expect(sessionMonthYear(new Date(2026, 3, 27, 14, 33).toISOString())).toBe(
      'April, 2026',
    );
  });

  it('spells out every month in full', () => {
    const names = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    names.forEach((name, i) => {
      expect(sessionMonthYear(new Date(2026, i, 15, 12, 0).toISOString())).toBe(
        `${name}, 2026`,
      );
    });
  });
});

describe('sessionTime', () => {
  it('formats an afternoon time as h:mm PM', () => {
    expect(sessionTime(new Date(2026, 3, 27, 14, 33).toISOString())).toBe(
      '2:33 PM',
    );
  });

  it('formats a morning time as h:mm AM', () => {
    expect(sessionTime(new Date(2026, 3, 27, 9, 5).toISOString())).toBe(
      '9:05 AM',
    );
  });

  it('renders noon as 12 PM, not 0 PM', () => {
    expect(sessionTime(new Date(2026, 3, 27, 12, 0).toISOString())).toBe(
      '12:00 PM',
    );
    expect(sessionTime(new Date(2026, 3, 27, 12, 59).toISOString())).toBe(
      '12:59 PM',
    );
  });

  it('renders midnight as 12 AM, not 0 AM', () => {
    expect(sessionTime(new Date(2026, 3, 27, 0, 0).toISOString())).toBe(
      '12:00 AM',
    );
    expect(sessionTime(new Date(2026, 3, 27, 0, 7).toISOString())).toBe(
      '12:07 AM',
    );
  });

  it('zero-pads the minutes', () => {
    expect(sessionTime(new Date(2026, 3, 27, 13, 0).toISOString())).toBe(
      '1:00 PM',
    );
    expect(sessionTime(new Date(2026, 3, 27, 13, 9).toISOString())).toBe(
      '1:09 PM',
    );
    expect(sessionTime(new Date(2026, 3, 27, 13, 10).toISOString())).toBe(
      '1:10 PM',
    );
  });

  it('never pads the hour', () => {
    expect(sessionTime(new Date(2026, 3, 27, 1, 5).toISOString())).toBe(
      '1:05 AM',
    );
  });

  it('handles 11 AM / 11 PM either side of the meridiem flip', () => {
    expect(sessionTime(new Date(2026, 3, 27, 11, 59).toISOString())).toBe(
      '11:59 AM',
    );
    expect(sessionTime(new Date(2026, 3, 27, 23, 59).toISOString())).toBe(
      '11:59 PM',
    );
  });

  it('formats every hour of the day consistently', () => {
    const expected = [
      '12:30 AM', '1:30 AM', '2:30 AM', '3:30 AM', '4:30 AM', '5:30 AM',
      '6:30 AM', '7:30 AM', '8:30 AM', '9:30 AM', '10:30 AM', '11:30 AM',
      '12:30 PM', '1:30 PM', '2:30 PM', '3:30 PM', '4:30 PM', '5:30 PM',
      '6:30 PM', '7:30 PM', '8:30 PM', '9:30 PM', '10:30 PM', '11:30 PM',
    ];
    for (let h = 0; h < 24; h++) {
      expect(sessionTime(new Date(2026, 3, 27, h, 30).toISOString())).toBe(
        expected[h],
      );
    }
  });
});
