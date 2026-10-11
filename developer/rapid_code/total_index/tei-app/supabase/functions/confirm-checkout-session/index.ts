import {
  isPaidTier,
  json,
  options,
  requireUser,
  stripeGet,
  syncStripeSubscription,
  type StripeSubscription,
} from '../_shared/billing.ts';

type StripeCheckoutSession = {
  id: string;
  mode?: string;
  status?: string;
  payment_status?: string;
  client_reference_id?: string | null;
  metadata?: Record<string, string>;
  subscription?: string | StripeSubscription | null;
};

function validSessionId(value: unknown): value is string {
  return typeof value === 'string' && /^cs_(?:test_|live_)[A-Za-z0-9_]+$/.test(value);
}

Deno.serve(async (req) => {
  const preflight = options(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const { sessionId } = await req.json();
    if (!validSessionId(sessionId)) return json({ error: 'Invalid Checkout Session.' }, 400);

    const user = await requireUser(req);
    const session = await stripeGet(`checkout/sessions/${encodeURIComponent(sessionId)}`) as StripeCheckoutSession;
    if (session.mode !== 'subscription') return json({ error: 'This is not a subscription Checkout Session.' }, 400);
    if (session.client_reference_id !== user.id && session.metadata?.supabase_user_id !== user.id) {
      return json({ error: 'This Checkout Session does not belong to this account.' }, 403);
    }

    // The customer may return before Stripe has finalized asynchronous payment
    // methods. Do not grant access until Stripe says the session is complete.
    if (session.status !== 'complete') return json({ confirmed: false, subscription: null });

    const subscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;
    if (!subscriptionId) return json({ confirmed: false, subscription: null });

    const subscription = await stripeGet(`subscriptions/${encodeURIComponent(subscriptionId)}`) as StripeSubscription;
    if (subscription.metadata?.supabase_user_id !== user.id || !isPaidTier(subscription.metadata?.tei_tier)) {
      return json({ error: 'The Stripe subscription metadata does not match this account.' }, 403);
    }

    const synced = await syncStripeSubscription(subscription);
    return json({
      confirmed: synced.status === 'active' || synced.status === 'trialing',
      subscription: synced,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Could not confirm Checkout.' }, 400);
  }
});
