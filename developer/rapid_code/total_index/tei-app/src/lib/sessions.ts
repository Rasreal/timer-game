import { supabase } from './supabase';
import type { SessionRow } from './database.types';

export interface SaveSessionArgs {
  userId: string;
  performedAt: string;
  sets: number;
  restSeconds: number;
  exertionPercent: number;
  cardioMinutes: number;
  tei: number;
  calculator?: string;
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
      sets: args.sets,
      rest_seconds: args.restSeconds,
      exertion_percent: args.exertionPercent,
      cardio_minutes: args.cardioMinutes,
      tei: args.tei,
      calculator: args.calculator ?? 'standard',
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

/** Sessions within a date range, oldest first — for the monthly calendar. */
export async function listSessionsBetween(
  fromIso: string,
  toIso: string,
): Promise<{ data: SessionRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .gte('performed_at', fromIso)
    .lte('performed_at', toIso)
    .order('performed_at', { ascending: true });

  return { data: data ?? [], error: error ? error.message : null };
}

/** The single most recent session, or null. Drives the Home screen's score. */
export async function latestSession(): Promise<SessionRow | null> {
  const { data } = await supabase
    .from('sessions')
    .select('*')
    .order('performed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ?? null;
}
