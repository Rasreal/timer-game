/**
 * Test suite for the TEI formula engine (src/lib/tei.ts).
 *
 * Expected values are taken from the client's own reference cases in
 * src/lib/tei.verify.ts and src/lib/tei.edge.ts, which were verified against
 * "Total Effect Index TEI - 5 Calculators.xlsx". Interpolation midpoints are
 * computed by hand from the dataset rows.
 */
import {
  SETS_INDEX,
  REST_DATASET,
  CARDIO_DATASET,
  EXERCISES_DATASET,
  CIRCUITS_DATASET,
  YOGA_DATASET,
  EFFECTIVE_RANGES,
  LIMITS,
  CALCULATOR_FIELDS,
  CALCULATOR_LABELS,
  GRADE_COLORS,
  plot,
  calculateTei,
  calculateBreakdownTei,
  calculateCircuitTei,
  calculateCardioTei,
  calculateYogaTei,
  displayTei,
  gradeAgainstPlan,
  type CalculatorId,
  type PlanGrade,
} from '../src/lib/tei';

const CALCULATOR_IDS: CalculatorId[] = [
  'standard',
  'breakdown',
  'circuit',
  'cardio',
  'yoga',
];

const PLAN_GRADES: PlanGrade[] = ['none', 'under', 'close', 'on', 'over'];

const ALL_DATASETS = [
  ['REST_DATASET', REST_DATASET],
  ['CARDIO_DATASET', CARDIO_DATASET],
  ['EXERCISES_DATASET', EXERCISES_DATASET],
  ['CIRCUITS_DATASET', CIRCUITS_DATASET],
  ['YOGA_DATASET', YOGA_DATASET],
] as const;

describe('plot()', () => {
  describe('exact dataset row matches', () => {
    // Every row of every dataset must plot back to its own tabulated value.
    describe.each(ALL_DATASETS)('%s', (_name, dataset) => {
      it.each(dataset.map(([x, y]) => [x, y]))(
        'plot(%p) === %p',
        (x, y) => {
          expect(plot(x as number, dataset)).toBeCloseTo(y as number, 10);
        },
      );
    });

    it('returns the precise (not merely close) row value for every node', () => {
      for (const [, dataset] of ALL_DATASETS) {
        for (const [x, y] of dataset) {
          expect(Math.abs(plot(x, dataset) - y)).toBeLessThan(1e-9);
        }
      }
    });
  });

  describe('linear interpolation between rows', () => {
    // Hand-computed midpoints: y = (y0 + y1) / 2 when x is halfway between
    // x0 and x1, since the interpolation is linear.

    it('rest 45s -> 1.375 (midpoint of 30->1.75 and 60->1.00)', () => {
      expect(plot(45, REST_DATASET)).toBeCloseTo(1.375, 10);
    });

    it('rest 75s -> 0.795 (midpoint of 60->1.00 and 90->0.59)', () => {
      expect(plot(75, REST_DATASET)).toBeCloseTo(0.795, 10);
    });

    it('rest 105s -> 0.48 (midpoint of 90->0.59 and 120->0.37)', () => {
      expect(plot(105, REST_DATASET)).toBeCloseTo(0.48, 10);
    });

    it('cardio 51min -> 1.05 (midpoint of 41->0.85 and 61->1.25)', () => {
      expect(plot(51, CARDIO_DATASET)).toBeCloseTo(1.05, 10);
    });

    it('cardio 8min -> 0.155 (midpoint of 5->0.11 and 11->0.20)', () => {
      expect(plot(8, CARDIO_DATASET)).toBeCloseTo(0.155, 10);
    });

    it('cardio 16min -> 0.30 (midpoint of 11->0.20 and 21->0.40)', () => {
      expect(plot(16, CARDIO_DATASET)).toBeCloseTo(0.3, 10);
    });

    it('yoga 56min -> 1.055 (midpoint of 53->1.00 and 59->1.11)', () => {
      expect(plot(56, YOGA_DATASET)).toBeCloseTo(1.055, 10);
    });

    it('exercises 4.5 -> 0.75 (midpoint of 4->0.5 and 5->1.0)', () => {
      expect(plot(4.5, EXERCISES_DATASET)).toBeCloseTo(0.75, 10);
    });

    it('circuits 4.5 -> 1.625 (midpoint of 4->1.5 and 5->1.75)', () => {
      expect(plot(4.5, CIRCUITS_DATASET)).toBeCloseTo(1.625, 10);
    });

    it('interpolates off-midpoint: cardio 31.5 -> 0.6375', () => {
      // Between 21->0.40 and 41->0.85. Slope = 0.45 / 20 = 0.0225 per min.
      // 0.40 + (31.5 - 21) * 0.0225 = 0.40 + 10.5 * 0.0225 = 0.63625... check:
      // 10.5 * 0.0225 = 0.23625 -> 0.63625
      expect(plot(31.5, CARDIO_DATASET)).toBeCloseTo(0.63625, 10);
    });

    it('interpolates a descending segment: rest 195 -> 0.24', () => {
      // Between 180->0.25 and 210->0.23: midpoint = 0.24.
      expect(plot(195, REST_DATASET)).toBeCloseTo(0.24, 10);
    });

    it('every gap midpoint equals the mean of the bracketing values', () => {
      for (const [, dataset] of ALL_DATASETS) {
        for (let i = 0; i < dataset.length - 1; i++) {
          const [x0, y0] = dataset[i];
          const [x1, y1] = dataset[i + 1];
          const mid = (x0 + x1) / 2;
          expect(plot(mid, dataset)).toBeCloseTo((y0 + y1) / 2, 10);
        }
      }
    });
  });

  describe('clamping outside the dataset range', () => {
    it('clamps up to the first row when input is below it (rest)', () => {
      expect(plot(1, REST_DATASET)).toBe(1.75);
      expect(plot(29.9, REST_DATASET)).toBe(1.75);
    });

    it('clamps up to the first row when input is below it (cardio)', () => {
      expect(plot(2, CARDIO_DATASET)).toBe(0.11);
    });

    it('clamps up to the first row for every dataset', () => {
      for (const [, dataset] of ALL_DATASETS) {
        const [firstX, firstY] = dataset[0];
        expect(plot(firstX / 2, dataset)).toBe(firstY);
      }
    });

    it('clamps down to the last row when input is above it (rest)', () => {
      expect(plot(9999, REST_DATASET)).toBe(0.22);
      expect(plot(241, REST_DATASET)).toBe(0.22);
    });

    it('clamps down to the last row when input is above it (cardio)', () => {
      expect(plot(9999, CARDIO_DATASET)).toBe(0.02);
    });

    it('clamps down to the last row for every dataset', () => {
      for (const [, dataset] of ALL_DATASETS) {
        const [lastX, lastY] = dataset[dataset.length - 1];
        expect(plot(lastX + 1000, dataset)).toBe(lastY);
      }
    });
  });

  describe('zero, negative and non-finite input', () => {
    it('returns 0 for input 0 (client rule: 0 means "none")', () => {
      for (const [, dataset] of ALL_DATASETS) {
        expect(plot(0, dataset)).toBe(0);
      }
    });

    it('returns 0 for negative input', () => {
      expect(plot(-5, REST_DATASET)).toBe(0);
      expect(plot(-1, CARDIO_DATASET)).toBe(0);
      expect(plot(-0.0001, YOGA_DATASET)).toBe(0);
      for (const [, dataset] of ALL_DATASETS) {
        expect(plot(-100, dataset)).toBe(0);
      }
    });

    it('returns 0 for NaN', () => {
      for (const [, dataset] of ALL_DATASETS) {
        expect(plot(Number.NaN, dataset)).toBe(0);
      }
    });

    it('returns 0 for Infinity and -Infinity', () => {
      // Note: Infinity does NOT clamp to the last row; the non-finite guard
      // runs first, so a garbage input can never inflate a score.
      for (const [, dataset] of ALL_DATASETS) {
        expect(plot(Number.POSITIVE_INFINITY, dataset)).toBe(0);
        expect(plot(Number.NEGATIVE_INFINITY, dataset)).toBe(0);
      }
    });
  });

  describe('dataset integrity', () => {
    it.each(ALL_DATASETS)('%s x values are strictly ascending', (_n, ds) => {
      for (let i = 1; i < ds.length; i++) {
        expect(ds[i][0]).toBeGreaterThan(ds[i - 1][0]);
      }
    });

    it.each(ALL_DATASETS)('%s has at least two rows', (_n, ds) => {
      expect(ds.length).toBeGreaterThanOrEqual(2);
    });

    it('SETS_INDEX is the workbook constant 0.06', () => {
      expect(SETS_INDEX).toBe(0.06);
    });
  });
});

describe('calculateTei() — Standard Strength Training', () => {
  it('matches the workbook reference case (11 sets / 60s / 80% / 41min)', () => {
    const r = calculateTei({
      sets: 11,
      restSeconds: 60,
      exertionPercent: 80,
      cardioMinutes: 41,
    });
    expect(r.tei).toBeCloseTo(13.78, 5);
    expect(displayTei(r.tei)).toBe(14);
  });

  it('exposes the reference case breakdown sub-values', () => {
    const r = calculateTei({
      sets: 11,
      restSeconds: 60,
      exertionPercent: 80,
      cardioMinutes: 41,
    });
    expect(r.setsValue).toBeCloseTo(0.66, 10); // 11 * 0.06
    expect(r.restValue).toBe(1.0); // 60s exact row
    expect(r.exertionValue).toBeCloseTo(0.8, 10); // 80 / 100
    expect(r.cardioValue).toBe(0.85); // 41min exact row
  });

  it('follows (sets*0.06 * rest * exertion + cardio) * 10', () => {
    const r = calculateTei({
      sets: 11,
      restSeconds: 60,
      exertionPercent: 80,
      cardioMinutes: 41,
    });
    const expected =
      (r.setsValue * r.restValue * r.exertionValue + r.cardioValue) * 10;
    expect(r.tei).toBeCloseTo(expected, 10);
  });

  it('zero cardio carries no phantom cardio credit', () => {
    const r = calculateTei({
      sets: 20,
      restSeconds: 60,
      exertionPercent: 80,
      cardioMinutes: 0,
    });
    // 20*0.06 = 1.2; 1.2 * 1.0 * 0.8 = 0.96; * 10 = 9.6
    expect(r.cardioValue).toBe(0);
    expect(r.tei).toBeCloseTo(9.6, 10);
  });

  it('an all-zero session scores exactly 0', () => {
    const r = calculateTei({
      sets: 0,
      restSeconds: 0,
      exertionPercent: 0,
      cardioMinutes: 0,
    });
    expect(r.setsValue).toBe(0);
    expect(r.restValue).toBe(0);
    expect(r.exertionValue).toBe(0);
    expect(r.cardioValue).toBe(0);
    expect(r.tei).toBe(0);
  });

  it('interpolates rest and cardio between rows', () => {
    const r = calculateTei({
      sets: 10,
      restSeconds: 45,
      exertionPercent: 50,
      cardioMinutes: 51,
    });
    expect(r.restValue).toBeCloseTo(1.375, 10);
    expect(r.cardioValue).toBeCloseTo(1.05, 10);
    // (10*0.06 * 1.375 * 0.5 + 1.05) * 10 = (0.4125 + 1.05) * 10 = 14.625
    expect(r.tei).toBeCloseTo(14.625, 10);
  });

  describe('non-finite inputs never produce NaN', () => {
    it('NaN sets is coerced to 0 sets', () => {
      const r = calculateTei({
        sets: Number.NaN,
        restSeconds: 60,
        exertionPercent: 80,
        cardioMinutes: 41,
      });
      expect(r.setsValue).toBe(0);
      expect(r.tei).toBeCloseTo(8.5, 10); // cardio-only remainder
      expect(Number.isFinite(r.tei)).toBe(true);
    });

    it('NaN exertion is coerced to 0', () => {
      const r = calculateTei({
        sets: 11,
        restSeconds: 60,
        exertionPercent: Number.NaN,
        cardioMinutes: 41,
      });
      expect(r.exertionValue).toBe(0);
      expect(r.tei).toBeCloseTo(8.5, 10);
    });

    it('Infinity rest/exertion and NaN cardio collapse to 0', () => {
      const r = calculateTei({
        sets: 11,
        restSeconds: Number.POSITIVE_INFINITY,
        exertionPercent: Number.POSITIVE_INFINITY,
        cardioMinutes: Number.NaN,
      });
      expect(r.restValue).toBe(0);
      expect(r.exertionValue).toBe(0);
      expect(r.cardioValue).toBe(0);
      expect(r.tei).toBe(0);
    });

    it('every non-finite combination stays finite and non-negative', () => {
      const bad = [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
      for (const v of bad) {
        for (const key of ['sets', 'restSeconds', 'exertionPercent', 'cardioMinutes'] as const) {
          const inputs = {
            sets: 11,
            restSeconds: 60,
            exertionPercent: 80,
            cardioMinutes: 41,
            [key]: v,
          };
          const { tei } = calculateTei(inputs);
          expect(Number.isFinite(tei)).toBe(true);
          expect(tei).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('directional behaviour', () => {
    const std = (s: number, r: number, e: number, c: number) =>
      calculateTei({ sets: s, restSeconds: r, exertionPercent: e, cardioMinutes: c }).tei;

    it('more sets never lowers the score', () => {
      for (let s = 1; s < 44; s++) {
        expect(std(s + 1, 60, 80, 41)).toBeGreaterThanOrEqual(std(s, 60, 80, 41));
      }
    });

    it('more rest never raises the score', () => {
      for (let rest = 30; rest < 240; rest += 5) {
        expect(std(20, rest + 5, 80, 41)).toBeLessThanOrEqual(std(20, rest, 80, 41));
      }
    });

    it('more exertion never lowers the score', () => {
      for (let e = 50; e < 100; e++) {
        expect(std(20, 60, e + 1, 41)).toBeGreaterThanOrEqual(std(20, 60, e, 41));
      }
    });
  });
});

describe('calculateBreakdownTei() — Breakdown Strength Training', () => {
  const ref = {
    sets: 4,
    breakdowns: 4,
    restSeconds: 60,
    exertionPercent: 70,
    cardioMinutes: 36,
  };

  it('matches the workbook reference case (B106) -> 14.095', () => {
    expect(calculateBreakdownTei(ref).tei).toBeCloseTo(14.095, 5);
  });

  it('displays the reference case as 14', () => {
    expect(displayTei(calculateBreakdownTei(ref).tei)).toBe(14);
  });

  it('exposes the reference case breakdown sub-values', () => {
    const r = calculateBreakdownTei(ref);
    expect(r.setsValue).toBeCloseTo(0.24, 10); // 4 * 0.06
    expect(r.breakdownsValue).toBe(4); // raw count, not plotted
    expect(r.restValue).toBe(1.0); // 60s exact row
    expect(r.exertionValue).toBeCloseTo(0.7, 10);
    // 36min interpolates between 21->0.40 and 41->0.85:
    // 0.40 + 15 * (0.45/20) = 0.40 + 0.3375 = 0.7375
    expect(r.cardioValue).toBeCloseTo(0.7375, 10);
  });

  it('puts exertion INSIDE the 0.06 product (differs from Standard)', () => {
    const r = calculateBreakdownTei(ref);
    const expected =
      (4 * 4 * r.exertionValue * SETS_INDEX * r.restValue + r.cardioValue) * 10;
    expect(r.tei).toBeCloseTo(expected, 10);
  });

  it('zero breakdowns leaves only the cardio term', () => {
    const r = calculateBreakdownTei({ ...ref, breakdowns: 0 });
    expect(r.breakdownsValue).toBe(0);
    expect(r.tei).toBeCloseTo(r.cardioValue * 10, 10);
  });

  it('zero cardio scores from strength alone', () => {
    const r = calculateBreakdownTei({
      sets: 5,
      breakdowns: 2,
      restSeconds: 90,
      exertionPercent: 80,
      cardioMinutes: 0,
    });
    expect(r.cardioValue).toBe(0);
    // 5 * 2 * 0.8 * 0.06 * 0.59 = 0.2832 -> * 10 = 2.832
    expect(r.tei).toBeCloseTo(2.832, 10);
  });

  it('an all-zero session scores exactly 0', () => {
    const r = calculateBreakdownTei({
      sets: 0,
      breakdowns: 0,
      restSeconds: 0,
      exertionPercent: 0,
      cardioMinutes: 0,
    });
    expect(r.tei).toBe(0);
  });

  it('non-finite inputs collapse to 0 rather than NaN', () => {
    const r = calculateBreakdownTei({
      sets: Number.NaN,
      breakdowns: Number.NaN,
      restSeconds: Number.NaN,
      exertionPercent: Number.NaN,
      cardioMinutes: Number.NaN,
    });
    expect(r).toEqual({
      setsValue: 0,
      breakdownsValue: 0,
      restValue: 0,
      exertionValue: 0,
      cardioValue: 0,
      tei: 0,
    });
  });

  it('Infinity inputs stay finite', () => {
    const r = calculateBreakdownTei({
      ...ref,
      breakdowns: Number.POSITIVE_INFINITY,
    });
    expect(Number.isFinite(r.tei)).toBe(true);
  });
});

describe('calculateCircuitTei() — Circuit Strength Training', () => {
  const ref = {
    exercises: 5,
    circuits: 7,
    exertionPercent: 55,
    cardioMinutes: 14,
  };

  it('matches the workbook reference case (B116) -> 14.15', () => {
    expect(calculateCircuitTei(ref).tei).toBeCloseTo(14.15, 5);
  });

  it('displays the reference case as 14', () => {
    expect(displayTei(calculateCircuitTei(ref).tei)).toBe(14);
  });

  it('exposes the reference case breakdown sub-values', () => {
    const r = calculateCircuitTei(ref);
    expect(r.exercisesValue).toBe(1); // 5 exercises exact row
    expect(r.circuitsValue).toBe(1); // 7 circuits exact row
    expect(r.exertionValue).toBeCloseTo(0.55, 10);
    // 14min interpolates between 11->0.20 and 21->0.40: 0.20 + 3*0.02 = 0.26
    expect(r.cardioValue).toBeCloseTo(0.26, 10);
  });

  it('multiplies raw counts AND their plotted index values', () => {
    const r = calculateCircuitTei(ref);
    const expected =
      (r.exertionValue *
        (5 * 7 * SETS_INDEX) *
        (r.circuitsValue * r.exercisesValue) +
        r.cardioValue) *
      10;
    expect(r.tei).toBeCloseTo(expected, 10);
  });

  it('uses plotted peaks at 5 exercises / 5 circuits', () => {
    const r = calculateCircuitTei({
      exercises: 5,
      circuits: 5,
      exertionPercent: 80,
      cardioMinutes: 20,
    });
    expect(r.exercisesValue).toBe(1); // dataset peak
    expect(r.circuitsValue).toBe(1.75); // dataset peak
    // 20min: between 11->0.20 and 21->0.40 -> 0.20 + 9*0.02 = 0.38
    expect(r.cardioValue).toBeCloseTo(0.38, 10);
    // (0.8 * (25*0.06) * (1.75*1) + 0.38) * 10 = (0.8*1.5*1.75 + 0.38)*10
    //  = (2.1 + 0.38) * 10 = 24.8
    expect(r.tei).toBeCloseTo(24.8, 10);
  });

  it('zero exercises leaves only the cardio term', () => {
    const r = calculateCircuitTei({ ...ref, exercises: 0 });
    expect(r.exercisesValue).toBe(0);
    expect(r.tei).toBeCloseTo(r.cardioValue * 10, 10);
  });

  it('an all-zero session scores exactly 0', () => {
    const r = calculateCircuitTei({
      exercises: 0,
      circuits: 0,
      exertionPercent: 0,
      cardioMinutes: 0,
    });
    expect(r.tei).toBe(0);
  });

  it('non-finite inputs collapse to 0 rather than NaN', () => {
    const r = calculateCircuitTei({
      exercises: Number.NaN,
      circuits: Number.POSITIVE_INFINITY,
      exertionPercent: Number.NaN,
      cardioMinutes: Number.NaN,
    });
    expect(r).toEqual({
      exercisesValue: 0,
      circuitsValue: 0,
      exertionValue: 0,
      cardioValue: 0,
      tei: 0,
    });
  });
});

describe('calculateCardioTei() — Cardio ONLY Training', () => {
  it('matches the workbook reference case (B41, 41min) -> 8.5', () => {
    expect(calculateCardioTei({ cardioMinutes: 41 }).tei).toBeCloseTo(8.5, 5);
  });

  it('displays the reference case as 9', () => {
    expect(displayTei(calculateCardioTei({ cardioMinutes: 41 }).tei)).toBe(9);
  });

  it('exposes the reference case breakdown sub-value', () => {
    expect(calculateCardioTei({ cardioMinutes: 41 }).cardioValue).toBe(0.85);
  });

  it('is exactly the plotted cardio value times ten', () => {
    for (const [x, y] of CARDIO_DATASET) {
      const r = calculateCardioTei({ cardioMinutes: x });
      expect(r.cardioValue).toBeCloseTo(y, 10);
      expect(r.tei).toBeCloseTo(y * 10, 10);
    }
  });

  it('peaks at the 61-minute dataset row', () => {
    expect(calculateCardioTei({ cardioMinutes: 61 }).tei).toBeCloseTo(12.5, 10);
  });

  it('zero cardio scores exactly 0', () => {
    expect(calculateCardioTei({ cardioMinutes: 0 })).toEqual({
      cardioValue: 0,
      tei: 0,
    });
  });

  it('negative cardio scores exactly 0', () => {
    expect(calculateCardioTei({ cardioMinutes: -30 }).tei).toBe(0);
  });

  it('non-finite cardio scores exactly 0', () => {
    expect(calculateCardioTei({ cardioMinutes: Number.NaN }).tei).toBe(0);
    expect(
      calculateCardioTei({ cardioMinutes: Number.POSITIVE_INFINITY }).tei,
    ).toBe(0);
  });
});

describe('calculateYogaTei() — YOGA Training', () => {
  const ref = { yogaMinutes: 59, exertionPercent: 100, cardioMinutes: 17 };

  it('matches the workbook reference case (B84) -> 14.3', () => {
    expect(calculateYogaTei(ref).tei).toBeCloseTo(14.3, 5);
  });

  it('displays the reference case as 14', () => {
    expect(displayTei(calculateYogaTei(ref).tei)).toBe(14);
  });

  it('exposes the reference case breakdown sub-values', () => {
    const r = calculateYogaTei(ref);
    expect(r.yogaValue).toBe(1.11); // 59min exact row
    expect(r.exertionValue).toBe(1); // 100 / 100
    // 17min: between 11->0.20 and 21->0.40 -> 0.20 + 6*0.02 = 0.32
    expect(r.cardioValue).toBeCloseTo(0.32, 10);
  });

  it('follows ((yoga * exertion) + cardio) * 10', () => {
    const r = calculateYogaTei(ref);
    const expected = (r.yogaValue * r.exertionValue + r.cardioValue) * 10;
    expect(r.tei).toBeCloseTo(expected, 10);
  });

  it('interpolates yoga minutes between rows', () => {
    const r = calculateYogaTei({
      yogaMinutes: 60,
      exertionPercent: 80,
      cardioMinutes: 15,
    });
    // 60min: between 59->1.11 and 77->1.19 -> 1.11 + (1/18)*0.08
    expect(r.yogaValue).toBeCloseTo(1.11 + 0.08 / 18, 10);
    expect(r.exertionValue).toBeCloseTo(0.8, 10);
    // 15min: 0.20 + 4*0.02 = 0.28
    expect(r.cardioValue).toBeCloseTo(0.28, 10);
    expect(r.tei).toBeCloseTo((r.yogaValue * 0.8 + 0.28) * 10, 10);
  });

  it('zero yoga leaves only the cardio term', () => {
    const r = calculateYogaTei({
      yogaMinutes: 0,
      exertionPercent: 80,
      cardioMinutes: 41,
    });
    expect(r.yogaValue).toBe(0);
    expect(r.tei).toBeCloseTo(8.5, 10);
  });

  it('an all-zero session scores exactly 0', () => {
    expect(
      calculateYogaTei({ yogaMinutes: 0, exertionPercent: 0, cardioMinutes: 0 })
        .tei,
    ).toBe(0);
  });

  it('non-finite inputs collapse to 0 rather than NaN', () => {
    expect(
      calculateYogaTei({
        yogaMinutes: Number.NaN,
        exertionPercent: Number.NaN,
        cardioMinutes: Number.NaN,
      }),
    ).toEqual({ yogaValue: 0, exertionValue: 0, cardioValue: 0, tei: 0 });
  });
});

describe('displayTei()', () => {
  it('rounds the workbook reference 13.78 to 14', () => {
    expect(displayTei(13.78)).toBe(14);
  });

  it('rounds down below .5', () => {
    expect(displayTei(13.49)).toBe(13);
    expect(displayTei(0.4)).toBe(0);
  });

  it('rounds up above .5', () => {
    expect(displayTei(13.51)).toBe(14);
  });

  it('rounds .5 up (Math.round half-up)', () => {
    expect(displayTei(13.5)).toBe(14);
    expect(displayTei(14.5)).toBe(15);
    expect(displayTei(0.5)).toBe(1);
  });

  it('rounds negative .5 toward positive infinity (Math.round semantics)', () => {
    // Math.round(-13.5) === -13, not -14. Scores are never negative in
    // practice, but this documents the behaviour.
    expect(displayTei(-13.5)).toBe(-13);
    expect(displayTei(-13.6)).toBe(-14);
  });

  it('leaves whole numbers unchanged', () => {
    expect(displayTei(0)).toBe(0);
    expect(displayTei(14)).toBe(14);
    expect(displayTei(33)).toBe(33);
  });
});

describe('gradeAgainstPlan()', () => {
  describe('no comparable plan -> "none"', () => {
    it('null planned', () => {
      expect(gradeAgainstPlan(14, null)).toBe('none');
    });

    it('undefined planned', () => {
      expect(gradeAgainstPlan(14, undefined)).toBe('none');
    });

    it('zero planned', () => {
      expect(gradeAgainstPlan(14, 0)).toBe('none');
    });

    it('negative planned', () => {
      expect(gradeAgainstPlan(14, -10)).toBe('none');
      expect(gradeAgainstPlan(14, -0.0001)).toBe('none');
    });
  });

  describe('boundaries, exactly', () => {
    it('ratio 1.1 is "on" (inclusive upper edge)', () => {
      expect(gradeAgainstPlan(11, 10)).toBe('on');
    });

    it('just over ratio 1.1 is "over"', () => {
      expect(gradeAgainstPlan(11.1, 10)).toBe('over');
      expect(gradeAgainstPlan(11.000001, 10)).toBe('over');
    });

    it('ratio 0.9 is "on" (inclusive lower edge)', () => {
      expect(gradeAgainstPlan(9, 10)).toBe('on');
    });

    it('ratio 0.899 is "close"', () => {
      expect(gradeAgainstPlan(8.99, 10)).toBe('close');
      expect(gradeAgainstPlan(8.9, 10)).toBe('close');
    });

    it('ratio 0.7 is "close" (inclusive lower edge)', () => {
      expect(gradeAgainstPlan(7, 10)).toBe('close');
    });

    it('ratio 0.699 is "under"', () => {
      expect(gradeAgainstPlan(6.99, 10)).toBe('under');
      expect(gradeAgainstPlan(6, 10)).toBe('under');
    });
  });

  describe('mid-band values', () => {
    it('ratio 1.0 is "on"', () => {
      expect(gradeAgainstPlan(10, 10)).toBe('on');
    });

    it('ratio 2.0 is "over"', () => {
      expect(gradeAgainstPlan(20, 10)).toBe('over');
    });

    it('ratio 0.8 is "close"', () => {
      expect(gradeAgainstPlan(8, 10)).toBe('close');
    });

    it('ratio 0 is "under"', () => {
      expect(gradeAgainstPlan(0, 10)).toBe('under');
    });

    it('negative actual is "under"', () => {
      expect(gradeAgainstPlan(-5, 10)).toBe('under');
    });
  });

  it('returns only declared PlanGrade values across a wide sweep', () => {
    for (let actual = 0; actual <= 30; actual += 0.25) {
      expect(PLAN_GRADES).toContain(gradeAgainstPlan(actual, 14));
    }
  });
});

describe('EFFECTIVE_RANGES', () => {
  it('holds the five documented ranges, in order', () => {
    expect(EFFECTIVE_RANGES).toEqual([
      { label: 'WEEKLY', min: 55, max: 111 },
      { label: 'MONTHLY', min: 250, max: 500 },
      { label: 'QUARTERLY', min: 750, max: 1350 },
      { label: 'SEMI-ANNUAL', min: 1500, max: 2250 },
      { label: 'ANNUAL', min: 3000, max: 4500 },
    ]);
  });

  it('has exactly 5 entries', () => {
    expect(EFFECTIVE_RANGES).toHaveLength(5);
  });

  it.each(EFFECTIVE_RANGES.map((r) => [r.label, r.min, r.max]))(
    '%s has min < max',
    (_label, min, max) => {
      expect(min).toBeLessThan(max as number);
    },
  );

  it('ranges ascend without overlap across periods', () => {
    for (let i = 1; i < EFFECTIVE_RANGES.length; i++) {
      expect(EFFECTIVE_RANGES[i].min).toBeGreaterThan(
        EFFECTIVE_RANGES[i - 1].max,
      );
    }
  });
});

describe('LIMITS', () => {
  it('matches the workbook Specification column exactly', () => {
    expect(LIMITS).toEqual({
      sets: { min: 1, max: 44, overAt: 33 },
      rest: { min: 30, max: 240, underAt: 30 },
      exertion: { min: 50, max: 100 },
      cardio: { min: 7, max: 150, overAt: 65, allowsZero: true },
      breakdowns: { min: 1, max: 5, overAt: 3 },
      exercises: { min: 1, max: 10, overAt: 5 },
      circuits: { min: 1, max: 10, overAt: 5 },
      yogaMinutes: { min: 4, max: 100, overAt: 65 },
      tei: { min: 3, max: 33, overAt: 22, implausibleAbove: 33 },
    });
  });

  it('sets: 1..44, red above 33', () => {
    expect(LIMITS.sets).toEqual({ min: 1, max: 44, overAt: 33 });
  });

  it('cardio: 7..150, red above 65, zero allowed', () => {
    expect(LIMITS.cardio.min).toBe(7);
    expect(LIMITS.cardio.max).toBe(150);
    expect(LIMITS.cardio.overAt).toBe(65);
    expect(LIMITS.cardio.allowsZero).toBe(true);
  });

  it('exertion: 50..100', () => {
    expect(LIMITS.exertion).toEqual({ min: 50, max: 100 });
  });

  it('rest: 30..240, under-range at 30', () => {
    expect(LIMITS.rest).toEqual({ min: 30, max: 240, underAt: 30 });
  });

  it('breakdowns: 1..5, red above 3', () => {
    expect(LIMITS.breakdowns).toEqual({ min: 1, max: 5, overAt: 3 });
  });

  it('exercises and circuits: 1..10, red above 5', () => {
    expect(LIMITS.exercises).toEqual({ min: 1, max: 10, overAt: 5 });
    expect(LIMITS.circuits).toEqual({ min: 1, max: 10, overAt: 5 });
  });

  it('yogaMinutes: 4..100, red above 65', () => {
    expect(LIMITS.yogaMinutes).toEqual({ min: 4, max: 100, overAt: 65 });
  });

  it('tei score band: 3..33, red above 22, implausible above 33', () => {
    expect(LIMITS.tei).toEqual({
      min: 3,
      max: 33,
      overAt: 22,
      implausibleAbove: 33,
    });
  });

  it('every limit has min < max', () => {
    for (const limit of Object.values(LIMITS)) {
      expect((limit as { min: number }).min).toBeLessThan(
        (limit as { max: number }).max,
      );
    }
  });

  it('every overAt sits inside its own min..max band', () => {
    for (const limit of Object.values(LIMITS)) {
      const l = limit as { min: number; max: number; overAt?: number };
      if (l.overAt === undefined) continue;
      expect(l.overAt).toBeGreaterThanOrEqual(l.min);
      expect(l.overAt).toBeLessThanOrEqual(l.max);
    }
  });

  it("rest limits bracket the rest dataset's own x range", () => {
    expect(LIMITS.rest.min).toBe(REST_DATASET[0][0]);
    expect(LIMITS.rest.max).toBe(REST_DATASET[REST_DATASET.length - 1][0]);
  });

  it("yoga limits bracket the yoga dataset's own x range", () => {
    expect(LIMITS.yogaMinutes.min).toBe(YOGA_DATASET[0][0]);
    expect(LIMITS.yogaMinutes.max).toBe(YOGA_DATASET[YOGA_DATASET.length - 1][0]);
  });

  it('cardio max matches the last cardio dataset row', () => {
    expect(LIMITS.cardio.max).toBe(CARDIO_DATASET[CARDIO_DATASET.length - 1][0]);
  });

  // SUSPECTED BUG (minor, spec-vs-dataset mismatch, NOT fixed here):
  // LIMITS.cardio.min is 7, but CARDIO_DATASET's first row is at 5 minutes.
  // A logged 5- or 6-minute cardio entry is below the accepted input minimum
  // yet still plots to a real index value (0.11). Asserting current behaviour.
  it('cardio min (7) sits above the first cardio dataset row (5)', () => {
    expect(LIMITS.cardio.min).toBe(7);
    expect(CARDIO_DATASET[0][0]).toBe(5);
    expect(LIMITS.cardio.min).toBeGreaterThan(CARDIO_DATASET[0][0]);
  });

  // SUSPECTED BUG (minor, boundary semantics, NOT fixed here):
  // LIMITS.exercises.min / LIMITS.circuits.min are 1, but EXERCISES_DATASET
  // starts at 2 exercises. plot(1, EXERCISES_DATASET) clamps up to 0.2 rather
  // than interpolating, so 1 exercise scores the same as 2.
  it('exercises min (1) sits below the first exercises dataset row (2)', () => {
    expect(LIMITS.exercises.min).toBe(1);
    expect(EXERCISES_DATASET[0][0]).toBe(2);
    expect(plot(1, EXERCISES_DATASET)).toBe(plot(2, EXERCISES_DATASET));
  });
});

describe('CALCULATOR_FIELDS', () => {
  it('has an entry for every CalculatorId', () => {
    expect(Object.keys(CALCULATOR_FIELDS).sort()).toEqual(
      [...CALCULATOR_IDS].sort(),
    );
  });

  it.each(CALCULATOR_IDS)('%s has a non-empty field list', (id) => {
    expect(Array.isArray(CALCULATOR_FIELDS[id])).toBe(true);
    expect(CALCULATOR_FIELDS[id].length).toBeGreaterThan(0);
  });

  it('lists the documented fields per calculator', () => {
    expect(CALCULATOR_FIELDS.standard).toEqual([
      'sets',
      'restSeconds',
      'exertionPercent',
      'cardioMinutes',
    ]);
    expect(CALCULATOR_FIELDS.breakdown).toEqual([
      'sets',
      'breakdowns',
      'restSeconds',
      'exertionPercent',
      'cardioMinutes',
    ]);
    expect(CALCULATOR_FIELDS.circuit).toEqual([
      'exercises',
      'circuits',
      'exertionPercent',
      'cardioMinutes',
    ]);
    expect(CALCULATOR_FIELDS.cardio).toEqual(['cardioMinutes']);
    expect(CALCULATOR_FIELDS.yoga).toEqual([
      'yogaMinutes',
      'exertionPercent',
      'cardioMinutes',
    ]);
  });

  it.each(CALCULATOR_IDS)('%s has no duplicate fields', (id) => {
    expect(new Set(CALCULATOR_FIELDS[id]).size).toBe(
      CALCULATOR_FIELDS[id].length,
    );
  });

  it('every calculator collects cardio minutes', () => {
    for (const id of CALCULATOR_IDS) {
      expect(CALCULATOR_FIELDS[id]).toContain('cardioMinutes');
    }
  });
});

describe('CALCULATOR_LABELS', () => {
  it('has an entry for every CalculatorId', () => {
    expect(Object.keys(CALCULATOR_LABELS).sort()).toEqual(
      [...CALCULATOR_IDS].sort(),
    );
  });

  it('matches the workbook sheet names', () => {
    expect(CALCULATOR_LABELS).toEqual({
      standard: 'Standard Strength Training',
      breakdown: 'Breakdown Strength Training',
      circuit: 'Circuit Strength Training',
      cardio: 'Cardio ONLY Training',
      yoga: 'YOGA Training',
    });
  });

  it.each(CALCULATOR_IDS)('%s label is a non-empty string', (id) => {
    expect(typeof CALCULATOR_LABELS[id]).toBe('string');
    expect(CALCULATOR_LABELS[id].length).toBeGreaterThan(0);
  });

  it('labels are unique', () => {
    const values = Object.values(CALCULATOR_LABELS);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe('GRADE_COLORS', () => {
  it('has an entry for every PlanGrade', () => {
    expect(Object.keys(GRADE_COLORS).sort()).toEqual([...PLAN_GRADES].sort());
  });

  it('matches the workbook colour-coding table', () => {
    expect(GRADE_COLORS).toEqual({
      none: '#888888',
      under: '#FFFFFF',
      close: '#FFD900',
      on: '#81D742',
      over: '#FF2222',
    });
  });

  it.each(PLAN_GRADES)('%s is a valid 6-digit hex colour', (grade) => {
    expect(GRADE_COLORS[grade]).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('colours are distinct per grade', () => {
    const values = Object.values(GRADE_COLORS);
    expect(new Set(values).size).toBe(values.length);
  });

  it('every grade that gradeAgainstPlan can return has a colour', () => {
    const produced = new Set<PlanGrade>([
      gradeAgainstPlan(14, null),
      gradeAgainstPlan(5, 10),
      gradeAgainstPlan(8, 10),
      gradeAgainstPlan(10, 10),
      gradeAgainstPlan(20, 10),
    ]);
    expect(produced.size).toBe(5);
    for (const g of produced) {
      expect(GRADE_COLORS[g]).toBeDefined();
    }
  });
});
