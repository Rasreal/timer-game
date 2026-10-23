import { supabase } from './supabase';
import type { TeiTier } from './database.types';

export type PaidTier = Exclude<TeiTier, 'elemental'>;
export type BillingStatus =
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'paused';

export interface SubscriptionSnapshot {
  tier: PaidTier;
  status: BillingStatus;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  updated_at: string;
}

type FunctionResult<T> = { data: T | null; error: string | null };

async function invoke<T>(name: string, body?: object): Promise<FunctionResult<T>> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) return { data: null, error: error.message };
  const message = (data as { error?: string } | null)?.error;
  return { data: message ? null : data, error: message ?? null };
}

export function createCheckoutSession(
  tier: PaidTier,
  successUrl: string,
  cancelUrl: string,
) {
  return invoke<{ checkoutUrl: string; sessionId: string }>('create-checkout-session', {
    tier,
    successUrl,
    cancelUrl,
  });
}

export function createBillingPortal(returnUrl: string) {
  return invoke<{ portalUrl: string }>('create-billing-portal', { returnUrl });
}

export function getSubscription() {
  return invoke<{ subscription: SubscriptionSnapshot | null }>('get-subscription');
}

export function confirmCheckoutSession(sessionId: string) {
  return invoke<{ confirmed: boolean; subscription: SubscriptionSnapshot | null }>('confirm-checkout-session', {
    sessionId,
  });
}

/**
 * `cancel` moves a paid account to Elemental when its paid period ends (at
 * once if it has no live Stripe subscription); `resume` undoes a scheduled
 * cancellation.
 */
export function changeSubscription(action: 'cancel' | 'resume') {
  return invoke<{ subscription: SubscriptionSnapshot | null; tier: TeiTier }>('change-subscription', {
    action,
  });
}
