import {
  adminClient,
  json,
  options,
  requireUser,
  stripeForm,
  syncStripeSubscription,
  type StripeSubscription,
} from '../_shared/billing.ts';

/**
 * Move a paid account down to TEI Elemental, or undo that before it happens.
 *
 * `cancel` schedules the Stripe subscription to end with the period already
 * paid for; the webhook drops the profile to Elemental when it does. An
 * account with a paid tier but no live Stripe subscription (granted by hand)
 * has nothing to wait for, so it moves to Elemental straight away.
 * `resume` clears a scheduled cancellation.
 */
Deno.serve(async (req) => {
  const preflight = options(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const { action } = await req.json();
    if (action !== 'cancel' && action !== 'resume') {
      return json({ error: 'Unknown subscription change.' }, 400);
    }

    const user = await requireUser(req);
    const admin = adminClient();
    const { data: existing, error } = await admin
      .from('subscriptions')
      .select('stripe_subscription_id, status')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;

    const live = existing && ['active', 'trialing', 'past_due'].includes(existing.status);

    if (!live) {
      if (action === 'resume') {
        return json({ error: 'There is no subscription to keep.' }, 404);
      }
      const { error: profileError } = await admin
        .from('profiles')
        .update({ tier: 'elemental' })
        .eq('id', user.id);
      if (profileError) throw profileError;
      return json({ subscription: null, tier: 'elemental' });
    }

    const updated = await stripeForm(
      `subscriptions/${existing.stripe_subscription_id}`,
      new URLSearchParams({ cancel_at_period_end: action === 'cancel' ? 'true' : 'false' }),
    ) as StripeSubscription;
    const subscription = await syncStripeSubscription(updated);
    return json({ subscription, tier: subscription.tier });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Could not change the subscription.' }, 400);
  }
});
