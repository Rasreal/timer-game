import { supabase } from './supabase';
import type { CalculatorId } from './tei';

export interface PlanRow {
  id: string;
  user_id: string;
  /** YYYY-MM-DD; a plan is per-day, not per-instant. */
  planned_for: string;
  tei: number;
  calculator: string;
  sets: number | null;
  rest_seconds: number | null;
  exertion_percent: number | null;
  cardio_minutes: number | null;
  breakdowns: number | null;
  exercises: number | null;
  circuits: number | null;
  yoga_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface SavePlanArgs {
  userId: string;
  /** Local calendar day, YYYY-MM-DD. */
  plannedFor: string;
  tei: number;
  calculator?: CalculatorId;
  sets?: number | null;
  restSeconds?: number | null;
  exertionPercent?: number | null;
  cardioMinutes?: number | null;
  breakdowns?: number | null;
  exercises?: number | null;
  circuits?: number | null;
  yogaMinutes?: number | null;
}

/** Local YYYY-MM-DD. Avoids toISOString(), which would shift across midnight. */
export function planDayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Create or replace the plan for a day.
 *
 * Upsert rather than insert: the deck lets a user re-plan a date, and the
 * table's (user_id, planned_for) unique constraint makes that a replacement.
 */
export async function savePlan(
  args: SavePlanArgs,
): Promise<{ data: PlanRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from('plans')
    .upsert(
      {
        user_id: args.userId,
        planned_for: args.plannedFor,
        tei: args.tei,
        calculator: args.calculator ?? 'standard',
        sets: args.sets ?? null,
        rest_seconds: args.restSeconds ?? null,
        exertion_percent: args.exertionPercent ?? null,
        cardio_minutes: args.cardioMinutes ?? null,
        breakdowns: args.breakdowns ?? null,
        exercises: args.exercises ?? null,
        circuits: args.circuits ?? null,
        yoga_minutes: args.yogaMinutes ?? null,
      },
      { onConflict: 'user_id,planned_for' },
    )
    .select()
    .single();

  return {
    data: (data as PlanRow | null) ?? null,
    error: error ? error.message : null,
  };
}

/** Plans in the half-open day range [from, to), oldest first. */
export async function listPlansBetween(
  fromDay: string,
  toDay: string,
): Promise<{ data: PlanRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .gte('planned_for', fromDay)
    .lt('planned_for', toDay)
    .order('planned_for', { ascending: true });

  return {
    data: (data as PlanRow[] | null) ?? [],
    error: error ? error.message : null,
  };
}

/**
 * Delete the plan for one day, if any.
 *
 * Scoped on user_id as well as the day: RLS already restricts the delete to
 * the caller's own rows, but the filter is made explicit here so the statement
 * is correct on its own terms rather than depending on the policy being right.
 */
export async function clearPlan(
  userId: string,
  plannedFor: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('plans')
    .delete()
    .eq('user_id', userId)
    .eq('planned_for', plannedFor);
  return { error: error ? error.message : null };
}

// Grading lives in tei.ts so it stays free of Supabase/React Native imports
// and can be unit-tested in plain Node.
export { gradeAgainstPlan, GRADE_COLORS, type PlanGrade } from './tei';
