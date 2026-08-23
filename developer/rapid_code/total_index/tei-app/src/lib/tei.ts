/**
 * Standard Strength Training Calculator (SSTC) — TEI formula engine.
 *
 * Source of truth:
 *   - "Standard Strength Training Calculator - Formula Cheat Sheet.pdf"
 *   - "Total Effect Index TEI - 5 Calculators.xlsx" → sheet "Standard Strength Training"
 *
 * Workbook formula (cell B93):
 *   =(((B13 * 0.06) * B28 * B56) + B71) * 10
 * where
 *   B13 = Strength Training Sets (raw user entry)
 *   B28 = Average Rest Period, plotted against the Rest dataset
 *   B56 = Perceived Exertion as a decimal (80% -> 0.80)
 *   B71 = Total Cardio Volume, plotted against the Cardio dataset
 *
 * The workbook plots AR and CV with XLOOKUP + manual linear interpolation
 * between the two bracketing dataset rows, so `plot()` below reproduces that
 * exactly rather than snapping to the nearest point.
 */

export const SETS_INDEX = 0.06;

/** Average Rest Period dataset — seconds (x) → index value (y). */
export const REST_DATASET: ReadonlyArray<readonly [number, number]> = [
  [30, 1.75],
  [60, 1.0],
  [90, 0.59],
  [120, 0.37],
  [150, 0.28],
  [180, 0.25],
  [210, 0.23],
  [240, 0.22],
];

/** Total Cardio Volume dataset — minutes (x) → index value (y). */
export const CARDIO_DATASET: ReadonlyArray<readonly [number, number]> = [
  [5, 0.11],
  [11, 0.2],
  [21, 0.4],
  [41, 0.85],
  [61, 1.25],
  [81, 1.1],
  [91, 0.67],
  [97, 0.33],
  [111, 0.11],
  [125, 0.05],
  [150, 0.02],
];

/**
 * Plot a user-entered value against a dataset.
 *
 * Exact match  -> that row's value.
 * Between rows -> linear interpolation between the bracketing rows.
 * Outside range-> clamped to the nearest endpoint.
 */
/** Coerce any non-finite input (NaN, Infinity) to 0 so it cannot poison a score. */
function num(v: number): number {
  return Number.isFinite(v) ? v : 0;
}

export function plot(
  input: number,
  dataset: ReadonlyArray<readonly [number, number]>,
): number {
  if (!Number.isFinite(input)) return 0;

  // Zero contributes nothing. Datasets start above zero (cardio at 5 min, yoga
  // at 4), so clamping to the first row would have credited a session that did
  // no cardio at all — the client confirmed 0 is a valid entry meaning none.
  if (input <= 0) return 0;

  const first = dataset[0];
  const last = dataset[dataset.length - 1];
  if (input <= first[0]) return first[1];
  if (input >= last[0]) return last[1];

  for (let i = 0; i < dataset.length - 1; i++) {
    const [x0, y0] = dataset[i];
    const [x1, y1] = dataset[i + 1];
    if (input === x0) return y0;
    if (input > x0 && input < x1) {
      return y0 + ((input - x0) * (y1 - y0)) / (x1 - x0);
    }
  }
  return last[1];
}

export interface SessionInputs {
  /** Total strength training sets in the session. */
  sets: number;
  /** Average rest period between sets, in seconds. */
  restSeconds: number;
  /** Average perceived exertion, as a whole percentage (e.g. 80). */
  exertionPercent: number;
  /** Total cardiovascular minutes in the session. */
  cardioMinutes: number;
}

export interface TeiBreakdown {
  setsValue: number;
  restValue: number;
  exertionValue: number;
  cardioValue: number;
  tei: number;
}

/**
 * TEI = (((sets x 0.06) x restPlotted) x exertionDecimal + cardioPlotted) x 10
 *
 * Reference case from the workbook: 11 sets, 60s rest, 80% exertion,
 * 41 cardio minutes -> 13.78, displayed as 14.
 */
export function calculateTei(inputs: SessionInputs): TeiBreakdown {
  const setsValue = num(inputs.sets) * SETS_INDEX;
  const restValue = plot(inputs.restSeconds, REST_DATASET);
  const exertionValue = num(inputs.exertionPercent) / 100;
  const cardioValue = plot(inputs.cardioMinutes, CARDIO_DATASET);

  const tei = (setsValue * restValue * exertionValue + cardioValue) * 10;

  return { setsValue, restValue, exertionValue, cardioValue, tei };
}

/** The large on-screen number is the TEI rounded to a whole value. */
export function displayTei(tei: number): number {
  return Math.round(tei);
}

/**
 * Recommended target TEI ranges, per the "TEI - Effective Ranges" screen.
 */
export const EFFECTIVE_RANGES = [
  { label: 'WEEKLY', min: 55, max: 111 },
  { label: 'MONTHLY', min: 250, max: 500 },
  { label: 'QUARTERLY', min: 750, max: 1350 },
  { label: 'SEMI-ANNUAL', min: 1500, max: 2250 },
  { label: 'ANNUAL', min: 3000, max: 4500 },
] as const;

/**
 * Denominator for the "% of Target" bar before the user has picked a
 * timeframe on Effective Ranges. It is the WEEKLY total — the smallest real
 * period target — rather than `LIMITS.tei.max`, which is a SINGLE-SESSION
 * ceiling and made an unset bar read more than three times too high.
 */
export const DEFAULT_TARGET_MAX = EFFECTIVE_RANGES[0].max;

/**
 * Input bounds, from the workbook's "Specification" column. Values outside
 * these bounds are flagged in the UI with the red over-range gradient.
 */
export const LIMITS = {
  sets: { min: 1, max: 44, overAt: 33 },
  rest: { min: 30, max: 240, underAt: 30 },
  exertion: { min: 50, max: 100 },
  // 0 is valid and means "no cardio"; any entry above 0 must be >= 7.
  cardio: { min: 7, max: 150, overAt: 65, allowsZero: true },
  breakdowns: { min: 1, max: 5, overAt: 3 },
  exercises: { min: 1, max: 10, overAt: 5 },
  circuits: { min: 1, max: 10, overAt: 5 },
  yogaMinutes: { min: 4, max: 100, overAt: 65 },
  /**
   * The calculated score. `overAt` drives the red gradient over the big
   * number; `implausibleAbove` triggers a "review how you are defining your
   * data" prompt, since the client considers >33 practically unsurvivable.
   */
  tei: { min: 3, max: 33, overAt: 22, implausibleAbove: 33 },
} as const;

/* ===========================================================================
 * The other four calculators (TEI Premium)
 *
 * Formulas and datasets taken from the client's workbook,
 * "Total Effect Index TEI - 5 Calculators.xlsx", one sheet per calculator.
 * Each `calculate*` function below reproduces its sheet's own worked example
 * exactly — see src/lib/tei.test.ts for those reference cases.
 * ======================================================================== */

/** Average number of exercises per circuit → index value (Circuit sheet). */
export const EXERCISES_DATASET: ReadonlyArray<readonly [number, number]> = [
  [2, 0.2], [3, 0.3], [4, 0.5], [5, 1], [6, 0.95],
  [7, 0.7], [8, 0.5], [9, 0.35], [10, 0.3],
];

/** Total number of circuits → index value (Circuit sheet). */
export const CIRCUITS_DATASET: ReadonlyArray<readonly [number, number]> = [
  [1, 0.25], [2, 0.33], [3, 0.75], [4, 1.5], [5, 1.75],
  [6, 1.55], [7, 1], [8, 0.55], [9, 0.33], [10, 0.22],
];

/** Total minutes of yoga → index value (Yoga sheet). */
export const YOGA_DATASET: ReadonlyArray<readonly [number, number]> = [
  [4, 0.22], [7, 0.33], [11, 0.38], [22, 0.44], [33, 0.48], [44, 0.59],
  [53, 1], [59, 1.11], [77, 1.19], [88, 1.22], [100, 1.25],
];

export type CalculatorId =
  | 'standard'
  | 'breakdown'
  | 'circuit'
  | 'cardio'
  | 'yoga';

/**
 * Breakdown Strength Training (workbook cell B106):
 *   ((((sets × breakdowns × exertion) × 0.06) × restValue) + cardioValue) × 10
 *
 * Note the exertion term sits INSIDE the 0.06 product here, unlike the
 * Standard model where it multiplies afterwards.
 */
export function calculateBreakdownTei(i: {
  sets: number;
  breakdowns: number;
  restSeconds: number;
  exertionPercent: number;
  cardioMinutes: number;
}): TeiBreakdown & { breakdownsValue: number } {
  const exertionValue = num(i.exertionPercent) / 100;
  const restValue = plot(i.restSeconds, REST_DATASET);
  const cardioValue = plot(i.cardioMinutes, CARDIO_DATASET);
  const tei =
    ((num(i.sets) * num(i.breakdowns) * exertionValue * SETS_INDEX * restValue) +
      cardioValue) * 10;

  return {
    setsValue: num(i.sets) * SETS_INDEX,
    breakdownsValue: num(i.breakdowns),
    restValue,
    exertionValue,
    cardioValue,
    tei,
  };
}

/**
 * Circuit Strength Training (workbook cell B116):
 *   ((exertion × ((exercises × circuits) × 0.06)
 *     × (circuitsValue × exercisesValue)) + cardioValue) × 10
 *
 * Both the raw counts AND their plotted index values appear in the product.
 */
export function calculateCircuitTei(i: {
  exercises: number;
  circuits: number;
  exertionPercent: number;
  cardioMinutes: number;
}): {
  exercisesValue: number;
  circuitsValue: number;
  exertionValue: number;
  cardioValue: number;
  tei: number;
} {
  const exertionValue = num(i.exertionPercent) / 100;
  const exercisesValue = plot(i.exercises, EXERCISES_DATASET);
  const circuitsValue = plot(i.circuits, CIRCUITS_DATASET);
  const cardioValue = plot(i.cardioMinutes, CARDIO_DATASET);
  const tei =
    ((exertionValue * (num(i.exercises) * num(i.circuits) * SETS_INDEX) *
      (circuitsValue * exercisesValue)) + cardioValue) * 10;

  return { exercisesValue, circuitsValue, exertionValue, cardioValue, tei };
}

/**
 * Cardio ONLY Training (workbook cell B41):
 *   cardioValue × 10
 */
export function calculateCardioTei(i: { cardioMinutes: number }): {
  cardioValue: number;
  tei: number;
} {
  const cardioValue = plot(i.cardioMinutes, CARDIO_DATASET);
  return { cardioValue, tei: cardioValue * 10 };
}

/**
 * Yoga Training (workbook cell B84):
 *   ((yogaValue × exertion) + cardioValue) × 10
 */
export function calculateYogaTei(i: {
  yogaMinutes: number;
  exertionPercent: number;
  cardioMinutes: number;
}): {
  yogaValue: number;
  exertionValue: number;
  cardioValue: number;
  tei: number;
} {
  const yogaValue = plot(i.yogaMinutes, YOGA_DATASET);
  const exertionValue = num(i.exertionPercent) / 100;
  const cardioValue = plot(i.cardioMinutes, CARDIO_DATASET);
  return {
    yogaValue,
    exertionValue,
    cardioValue,
    tei: ((yogaValue * exertionValue) + cardioValue) * 10,
  };
}

/** Which variables each calculator asks the user for. */
export const CALCULATOR_FIELDS: Record<CalculatorId, readonly string[]> = {
  standard: ['sets', 'restSeconds', 'exertionPercent', 'cardioMinutes'],
  breakdown: ['sets', 'breakdowns', 'restSeconds', 'exertionPercent', 'cardioMinutes'],
  circuit: ['exercises', 'circuits', 'exertionPercent', 'cardioMinutes'],
  cardio: ['cardioMinutes'],
  yoga: ['yogaMinutes', 'exertionPercent', 'cardioMinutes'],
};

export const CALCULATOR_LABELS: Record<CalculatorId, string> = {
  standard: 'Standard Strength Training',
  breakdown: 'Breakdown Strength Training',
  circuit: 'Circuit Strength Training',
  cardio: 'Cardio ONLY Training',
  yoga: 'YOGA Training',
};

/**
 * Bounds-check the variables a calculator uses, in the order it shows them.
 *
 * The guided /entry/* screens enforce LIMITS one variable at a time; direct
 * entry into a ring bypassed them entirely, so every calculator runs the same
 * check before it scores or saves. Returns the first problem found, worded to
 * match the guided screens, or null when everything is in range.
 *
 * `null` means "not entered yet" and is left to each screen's own `complete`
 * gate, so it is never reported here.
 */
export function validateSessionInputs(
  calculator: CalculatorId,
  values: Partial<Record<string, number | null>>,
): string | null {
  const between = (label: string, min: number, max: number) =>
    `${label} must be between ${min} and ${max}.`;

  // Client rule: a Cardio ONLY session entered on a strength calculator
  // zero-fills sets/rest/exertion rather than making the user type three
  // zeros, so that exact trio is "no strength training", not an out-of-range
  // entry. Any other zero among them still fails its own bound below.
  const cardioOnly =
    values.sets === 0 && values.restSeconds === 0 && values.exertionPercent === 0;

  for (const field of CALCULATOR_FIELDS[calculator]) {
    if (
      cardioOnly &&
      (field === 'sets' || field === 'restSeconds' || field === 'exertionPercent')
    ) {
      continue;
    }

    const v = values[field];
    if (v === null || v === undefined) continue;

    switch (field) {
      case 'sets':
        if (v < LIMITS.sets.min || v > LIMITS.sets.max)
          return between('Sets', LIMITS.sets.min, LIMITS.sets.max);
        break;
      case 'restSeconds':
        if (v < LIMITS.rest.min || v > LIMITS.rest.max)
          return between('Seconds', LIMITS.rest.min, LIMITS.rest.max);
        break;
      case 'exertionPercent':
        if (v < LIMITS.exertion.min || v > LIMITS.exertion.max)
          return between('% Exert', LIMITS.exertion.min, LIMITS.exertion.max);
        break;
      case 'cardioMinutes':
        // 0 is a valid entry meaning "no cardio this session".
        if (v !== 0 && (v < LIMITS.cardio.min || v > LIMITS.cardio.max))
          return `Minutes must be 0 for no cardio, or between ${LIMITS.cardio.min} and ${LIMITS.cardio.max}.`;
        break;
      case 'breakdowns':
        if (v < LIMITS.breakdowns.min || v > LIMITS.breakdowns.max)
          return between('Breakdowns', LIMITS.breakdowns.min, LIMITS.breakdowns.max);
        break;
      case 'exercises':
        if (v < LIMITS.exercises.min || v > LIMITS.exercises.max)
          return between('Exercises', LIMITS.exercises.min, LIMITS.exercises.max);
        break;
      case 'circuits':
        if (v < LIMITS.circuits.min || v > LIMITS.circuits.max)
          return between('Circuits', LIMITS.circuits.min, LIMITS.circuits.max);
        break;
      case 'yogaMinutes':
        if (v < LIMITS.yogaMinutes.min || v > LIMITS.yogaMinutes.max)
          return between('Yoga Mins', LIMITS.yogaMinutes.min, LIMITS.yogaMinutes.max);
        break;
    }
  }

  return null;
}

/**
 * How a logged score compares to that day's planned target.
 *
 * Thresholds are the workbook README's "General Color Coding for Data Review":
 *   gray   — no planned value to compare against
 *   white  — below the plan (under 70%)
 *   yellow — 70% to under 90%
 *   green  — 90% to 110%, i.e. on plan
 *   red    — over 110%, i.e. overtrained against the plan
 */
export type PlanGrade = 'none' | 'under' | 'close' | 'on' | 'over';

export function gradeAgainstPlan(
  actual: number,
  planned: number | null | undefined,
): PlanGrade {
  if (planned === null || planned === undefined || planned <= 0) return 'none';

  const ratio = actual / planned;
  if (ratio > 1.1) return 'over';
  if (ratio >= 0.9) return 'on';
  if (ratio >= 0.7) return 'close';
  return 'under';
}

/** Colours for `PlanGrade`, matching the workbook's table. */
export const GRADE_COLORS: Record<PlanGrade, string> = {
  none: '#888888',
  under: '#FFFFFF',
  close: '#FFD900',
  on: '#81D742',
  over: '#FF2222',
};
