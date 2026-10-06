import { makePlan, makeSession } from './helpers/mainRender';
import {
  currentTimeframePeriods,
  gradePeriod,
  reviewDayKey,
  totalPlansInPeriod,
  totalSessionsInPeriod,
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
