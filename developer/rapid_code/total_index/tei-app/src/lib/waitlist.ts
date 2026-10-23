import { supabase } from './supabase';

/** Loose shape check; the database function is the real validator. */
export function isValidEmail(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim());
}

/**
 * Add an address to the TEI Premium waitlist.
 *
 * Works signed in or out (sign-up visitors can join before they have an
 * account). Joining twice is not an error.
 */
export async function joinPremiumWaitlist(
  email: string,
  name = '',
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('join_premium_waitlist', {
    waitlist_email: email.trim(),
    waitlist_name: name.trim(),
  });
  return { error: error ? error.message : null };
}
