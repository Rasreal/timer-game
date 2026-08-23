import { supabase } from './supabase';
import type { SessionRow } from './database.types';
import type { CalculatorId } from './tei';

export interface SaveSessionArgs {
  userId: string;
  performedAt: string;
  cardioMinutes: number;
  tei: number;
  /** Which of the five models produced this score; defaults to 'standard'. */
  calculator?: CalculatorId;

  // Only the variables the chosen calculator actually uses are supplied; the
  // rest stay null in the row. Cardio ONLY, for instance, sets none of these.
  sets?: number | null;
  restSeconds?: number | null;
  exertionPercent?: number | null;
  breakdowns?: number | null;
  exercises?: number | null;
  circuits?: number | null;
  yogaMinutes?: number | null;
}

/**
 * Persist a completed training session.
 *
 * Only TEI Basic and Premium save history — Elemental is calculate-only by
 * design — so callers are expected to gate on tier before calling this.
 */
export async function saveSession(
  args: SaveSessionArgs,
): Promise<{ data: SessionRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: args.userId,
      performed_at: args.performedAt,
      cardio_minutes: args.cardioMinutes,
      tei: args.tei,
      calculator: args.calculator ?? 'standard',
      sets: args.sets ?? null,
      rest_seconds: args.restSeconds ?? null,
      exertion_percent: args.exertionPercent ?? null,
      breakdowns: args.breakdowns ?? null,
      exercises: args.exercises ?? null,
      circuits: args.circuits ?? null,
      yoga_minutes: args.yogaMinutes ?? null,
    })
    .select()
    .single();

  return { data: data ?? null, error: error ? error.message : null };
}

/** Most recent sessions first. Used by the Review screens. */
export async function listSessions(
  limit = 100,
): Promise<{ data: SessionRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('performed_at', { ascending: false })
    .limit(limit);

  return { data: data ?? [], error: error ? error.message : null };
}

/**
 * Sessions in the half-open range [fromIso, toIso), oldest first — for the
 * monthly calendar. Half-open so callers can pass the first instant of the
 * next month without double-counting or dropping the final second.
 */
export async function listSessionsBetween(
  fromIso: string,
  toIso: string,
): Promise<{ data: SessionRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .gte('performed_at', fromIso)
    .lt('performed_at', toIso)
    .order('performed_at', { ascending: true });

  return { data: data ?? [], error: error ? error.message : null };
}

/**
 * The single most recent session, or null. Drives the Home screen's score.
 *
 * Returns `error` like every sibling helper: dropping it made a permission or
 * network failure indistinguishable from "no sessions yet".
 */
export async function latestSession(): Promise<{
  data: SessionRow | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('performed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return { data: data ?? null, error: error ? error.message : null };
}
