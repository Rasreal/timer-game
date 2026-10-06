import type { PlanRow } from './plans';
import type { SessionRow } from './database.types';
import { EFFECTIVE_RANGES, gradeAgainstPlan, type PlanGrade } from './tei';

export type ReviewTimeframe = (typeof EFFECTIVE_RANGES)[number]['label'];

export interface TimeframePeriod {
  label: ReviewTimeframe;
  start: Date;
  /** The current point in the period: completed workouts stop here. */
  through: Date;
  /** The end of the whole period: future planned sessions remain included. */
  end: Date;
  min: number;
  max: number;
}

/** Local YYYY-MM-DD. Review buckets follow the member's device calendar. */
export function reviewDayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Current periods used by Premium Screen 18. End dates are exclusive, making
 * the periods safe to pass directly to the half-open Supabase range queries.
 */
export function currentTimeframePeriods(now = new Date()): TimeframePeriod[] {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const semiAnnualStart = new Date(now.getFullYear(), now.getMonth() < 6 ? 0 : 6, 1);
  const annualStart = new Date(now.getFullYear(), 0, 1);
  const starts: Record<ReviewTimeframe, Date> = {
    WEEKLY: weekStart,
    MONTHLY: monthStart,
    QUARTERLY: quarterStart,
    'SEMI-ANNUAL': semiAnnualStart,
    ANNUAL: annualStart,
  };
  const ends: Record<ReviewTimeframe, Date> = {
    WEEKLY: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7),
    MONTHLY: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    QUARTERLY: new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 1),
    'SEMI-ANNUAL': new Date(semiAnnualStart.getFullYear(), semiAnnualStart.getMonth() + 6, 1),
    ANNUAL: new Date(now.getFullYear() + 1, 0, 1),
  };

  return EFFECTIVE_RANGES.map((range) => ({
    ...range,
    start: starts[range.label],
    through: tomorrow.getTime() < ends[range.label].getTime() ? tomorrow : ends[range.label],
    end: ends[range.label],
  }));
}

export function totalSessionsInPeriod(
  rows: SessionRow[],
  start: Date,
  end: Date,
): number {
  const from = start.getTime();
  const until = end.getTime();
  return rows.reduce((sum, row) => {
    const time = new Date(row.performed_at).getTime();
    return time >= from && time < until ? sum + Number(row.tei) : sum;
  }, 0);
}

export function totalPlansInPeriod(
  rows: PlanRow[],
  start: Date,
  end: Date,
): number {
  const from = reviewDayKey(start);
  const until = reviewDayKey(end);
  return rows.reduce(
    (sum, row) => (row.planned_for >= from && row.planned_for < until ? sum + Number(row.tei) : sum),
    0,
  );
}

/** A period is ungraded until there is at least one planned TEI value. */
export function gradePeriod(actual: number, planned: number): PlanGrade {
  return gradeAgainstPlan(actual, planned > 0 ? planned : null);
}
