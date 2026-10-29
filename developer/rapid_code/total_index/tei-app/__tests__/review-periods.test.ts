import { makePlan, makeSession } from './helpers/mainRender';
import {
  currentTimeframePeriods,
  gradePeriod,
  reviewDayKey,
  totalPlansInPeriod,
  totalSessionsInPeriod,
  calculatorRoute,
  parseDayKey,
  previousFullWeekStart,
  sessionVariables,
  sessionsByDay,
  startOfWeek,
  sumTei,
  weekDates,
} from '../src/lib/review';

describe('Premium review periods', () => {
  const now = new Date(2026, 7, 15, 10, 0, 0);
  const periods = currentTimeframePeriods(now);

  it('uses current Sunday-start periods through today', () => {
    expect(periods.map((period) => period.label)).toEqual([
      'WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI-ANNUAL', 'ANNUAL',
    ]);
    expect(reviewDayKey(periods[0].start)).toBe('2026-08-09');
    expect(reviewDayKey(periods[0].end)).toBe('2026-08-16');
    expect(reviewDayKey(periods[2].start)).toBe('2026-07-01');
    expect(reviewDayKey(periods[3].start)).toBe('2026-07-01');
    expect(reviewDayKey(periods[4].start)).toBe('2026-01-01');
  });

  it('sums only sessions and plans inside a half-open period', () => {
    const weekly = periods[0];
    const inside = new Date(2026, 7, 12, 12).toISOString();
    const outside = new Date(2026, 7, 16, 12).toISOString();
    expect(totalSessionsInPeriod([
      makeSession({ performed_at: inside, tei: 12 }),
      makeSession({ id: 'outside', performed_at: outside, tei: 50 }),
    ], weekly.start, weekly.end)).toBe(12);
    expect(totalPlansInPeriod([
      makePlan({ planned_for: '2026-08-12', tei: 16 }),
      makePlan({ id: 'outside', planned_for: '2026-08-16', tei: 50 }),
    ], weekly.start, weekly.end)).toBe(16);
  });

  it('uses the workbook valuation bands for aggregate values', () => {
    expect(gradePeriod(0, 0)).toBe('none');
    expect(gradePeriod(8, 10)).toBe('close');
    expect(gradePeriod(10, 10)).toBe('on');
    expect(gradePeriod(12, 10)).toBe('over');
  });
});

describe('weekly review helpers', () => {
  it('parses a day key as local midnight', () => {
    expect(parseDayKey('2026-05-04')).toEqual(new Date(2026, 4, 4));
    expect(parseDayKey('nope')).toBeNull();
    expect(parseDayKey(undefined)).toBeNull();
  });

  it('weeks start on Sunday', () => {
    expect(startOfWeek(new Date(2026, 4, 6, 15))).toEqual(new Date(2026, 4, 3));
    expect(startOfWeek(new Date(2026, 4, 3))).toEqual(new Date(2026, 4, 3));
    expect(weekDates(new Date(2026, 4, 3)).map((d) => d.getDate())).toEqual([3, 4, 5, 6, 7, 8, 9]);
  });

  it('the snapshot week is the last finished Sunday-to-Saturday', () => {
    // Wednesday 29 Oct 2026 → the week of Sunday 18 Oct.
    expect(previousFullWeekStart(new Date(2026, 9, 29, 12))).toEqual(new Date(2026, 9, 18));
    // On a Sunday the week that just ended counts.
    expect(previousFullWeekStart(new Date(2026, 9, 25, 8))).toEqual(new Date(2026, 9, 18));
  });

  it('buckets sessions by local day, oldest first', () => {
    const late = makeSession({ id: 'late', performed_at: new Date(2026, 4, 4, 18).toISOString(), tei: 4 });
    const early = makeSession({ id: 'early', performed_at: new Date(2026, 4, 4, 7).toISOString(), tei: 16 });
    const other = makeSession({ id: 'other', performed_at: new Date(2026, 4, 5, 7).toISOString() });
    const byDay = sessionsByDay([late, other, early]);

    expect(byDay.get('2026-05-04')!.map((r) => r.id)).toEqual(['early', 'late']);
    expect(sumTei(byDay.get('2026-05-04')!)).toBe(20);
    expect(byDay.get('2026-05-05')!.map((r) => r.id)).toEqual(['other']);
  });

  it("lists each calculator's own variables", () => {
    expect(sessionVariables(makeSession()).map((v) => v.label)).toEqual(['Sets', 'Seconds', '% Exert', 'Minutes']);
    expect(sessionVariables(makeSession({ calculator: 'breakdown' })).map((v) => v.label)).toEqual([
      'Sets', 'Breakdowns', 'Seconds', '% Exert', 'Minutes',
    ]);
    expect(sessionVariables(makeSession({ calculator: 'circuit' }))[0].label).toBe('Exercises');
    expect(sessionVariables(makeSession({ calculator: 'cardio' }))).toHaveLength(1);
    expect(sessionVariables(makeSession({ calculator: 'yoga' }))[0].label).toBe('Yoga Mins');
  });

  it('routes each calculator to its own screen', () => {
    expect(calculatorRoute('standard')).toBe('/calculator');
    expect(calculatorRoute('yoga')).toBe('/calc/yoga');
  });
});
