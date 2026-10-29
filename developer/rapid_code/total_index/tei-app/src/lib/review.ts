import type { PlanRow } from './plans';
import type { SessionRow } from './database.types';
import {
  EFFECTIVE_RANGES,
  gradeAgainstPlan,
  type CalculatorId,
  type PlanGrade,
} from './tei';

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

/* ---------------------------------------------------------------------------
 * Weekly review (Ken's 22 Oct 2026 "Better explanation of REVIEW")
 * ------------------------------------------------------------------------ */

/** Parse a local YYYY-MM-DD without the UTC shift `new Date(string)` applies. */
export function parseDayKey(key: string | undefined): Date | null {
  const match = key?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** The Sunday on or before `date`, at local midnight. Weeks run Sun→Sat. */
export function startOfWeek(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
}

/** Seven consecutive days from `start`. */
export function weekDates(start: Date): Date[] {
  return Array.from(
    { length: 7 },
    (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
  );
}

/** Sunday of the last week that has fully finished — the SNAPSHOT week. */
export function previousFullWeekStart(now = new Date()): Date {
  const thisWeek = startOfWeek(now);
  return new Date(thisWeek.getFullYear(), thisWeek.getMonth(), thisWeek.getDate() - 7);
}

/** Sessions bucketed by local day, each day oldest first. */
export function sessionsByDay(rows: SessionRow[]): Map<string, SessionRow[]> {
  const out = new Map<string, SessionRow[]>();
  const sorted = [...rows].sort(
    (a, b) => new Date(a.performed_at).getTime() - new Date(b.performed_at).getTime(),
  );
  for (const row of sorted) {
    const key = reviewDayKey(new Date(row.performed_at));
    const day = out.get(key);
    if (day) day.push(row);
    else out.set(key, [row]);
  }
  return out;
}

export function sumTei(rows: SessionRow[]): number {
  return rows.reduce((sum, row) => sum + Number(row.tei), 0);
}

export interface SessionVariable {
  label: string;
  value: number | null;
}

/**
 * The headline variables of a saved session, in the order its calculator's
 * rings show them — the columns of a "7 Days in Review" row.
 */
export function sessionVariables(row: SessionRow): SessionVariable[] {
  switch (row.calculator as CalculatorId) {
    case 'breakdown':
      return [
        { label: 'Sets', value: row.sets },
        { label: 'Breakdowns', value: row.breakdowns },
        { label: 'Seconds', value: row.rest_seconds },
        { label: '% Exert', value: row.exertion_percent },
        { label: 'Minutes', value: row.cardio_minutes },
      ];
    case 'circuit':
      return [
        { label: 'Exercises', value: row.exercises },
        { label: 'Circuits', value: row.circuits },
        { label: '% Exert', value: row.exertion_percent },
        { label: 'Minutes', value: row.cardio_minutes },
      ];
    case 'cardio':
      return [{ label: 'Cardio Minutes', value: row.cardio_minutes }];
    case 'yoga':
      return [
        { label: 'Yoga Mins', value: row.yoga_minutes },
        { label: '% Exert', value: row.exertion_percent },
        { label: 'Minutes', value: row.cardio_minutes },
      ];
    default:
      return [
        { label: 'Sets', value: row.sets },
        { label: 'Seconds', value: row.rest_seconds },
        { label: '% Exert', value: row.exertion_percent },
        { label: 'Minutes', value: row.cardio_minutes },
      ];
  }
}

/** The calculator screen that edits a session saved by `calculator`. */
export function calculatorRoute(calculator: string): string {
  return calculator === 'standard' || !calculator ? '/calculator' : `/calc/${calculator}`;
}

