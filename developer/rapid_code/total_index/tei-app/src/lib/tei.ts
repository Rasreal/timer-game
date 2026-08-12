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
export function plot(
  input: number,
  dataset: ReadonlyArray<readonly [number, number]>,
): number {
  if (!Number.isFinite(input)) return 0;

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
  const setsValue = inputs.sets * SETS_INDEX;
  const restValue = plot(inputs.restSeconds, REST_DATASET);
  const exertionValue = inputs.exertionPercent / 100;
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
 * Input bounds, from the workbook's "Specification" column. Values outside
 * these bounds are flagged in the UI with the red over-range gradient.
 */
export const LIMITS = {
  sets: { min: 7, max: 150, overAt: 65 },
  rest: { min: 30, max: 240 },
  exertion: { min: 50, max: 100 },
  cardio: { min: 0, max: 150 },
} as const;
