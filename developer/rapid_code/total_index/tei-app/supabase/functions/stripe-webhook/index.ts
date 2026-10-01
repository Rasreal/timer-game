import { adminClient, json, stripeGet } from '../_shared/billing.ts';

type StripeSubscription = {
  id: string;
  customer: string;
  status: string;
  cancel_at_period_end?: boolean;
  current_period_end?: number | null;
  metadata?: Record<string, string>;
  items?: { data?: Array<{ price?: { id?: string } }> };
};

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

async function verifyStripeSignature(payload: string, signature: string | null): Promise<boolean> {
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!secret || !signature) return false;

  const parts = signature.split(',').map((part) => part.split('='));
  const timestamp = parts.find(([key]) => key === 't')?.[1];
  const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value);
  if (!timestamp || signatures.length === 0 || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const bytes = new Uint8Array(await crypto.subtle.sign(
    'HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`),
  ));
  const expected = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return signatures.some((candidate) => constantTimeEqual(expected, candidate));
}

function isPaidTier(value: unknown): value is 'basic' | 'premium' {
  return value === 'basic' || value === 'premium';
}

async function syncSubscription(subscription: StripeSubscription) {
  const admin = adminClient();
  let userId = subscription.metadata?.supabase_user_id;
  let tier = subscription.metadata?.tei_tier;

  if (!userId || !isPaidTier(tier)) {
    const { data: prior, error } = await admin
      .from('subscriptions')
      .select('user_id, tier')
      .or(`stripe_subscription_id.eq.${subscription.id},stripe_customer_id.eq.${subscription.customer}`)
      .maybeSingle();
    if (error) throw error;
    userId = prior?.user_id;
    tier = prior?.tier;
  }

  if (!userId || !isPaidTier(tier)) throw new Error('Subscription has no TEI user or plan metadata.');

  const status = subscription.status;
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;
  const { error: upsertError } = await admin.from('subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: subscription.customer,
    stripe_subscription_id: subscription.id,
    stripe_price_id: subscription.items?.data?.[0]?.price?.id ?? null,
    tier,
    status,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    current_period_end: currentPeriodEnd,
  }, { onConflict: 'user_id' });
  if (upsertError) throw upsertError;

  const active = status === 'active' || status === 'trialing';
  const { error: profileError } = await admin
    .from('profiles')
    .update({ tier: active ? tier : 'elemental' })
    .eq('id', userId);
  if (profileError) throw profileError;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const payload = await req.text();
  if (!await verifyStripeSignature(payload, req.headers.get('Stripe-Signature'))) {
    return json({ error: 'Invalid Stripe webhook signature.' }, 400);
  }

  try {
    const event = JSON.parse(payload) as { id: string; type: string; data: { object: StripeSubscription & { mode?: string; subscription?: string } } };
    const admin = adminClient();
    const { error: eventError } = await admin
      .from('stripe_events')
      .insert({ id: event.id, event_type: event.type });
    if (eventError?.code === '23505') return json({ received: true, duplicate: true });
    if (eventError) throw eventError;

    if (event.type === 'checkout.session.completed' && event.data.object.mode === 'subscription') {
      const subscriptionId = event.data.object.subscription;
      if (subscriptionId) await syncSubscription(await stripeGet(`subscriptions/${subscriptionId}`));
    } else if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      await syncSubscription(event.data.object);
    }

    return json({ received: true });
  } catch (error) {
    // Return a non-2xx response so Stripe retries a transient database/API failure.
    return json({ error: error instanceof Error ? error.message : 'Webhook processing failed.' }, 500);
  }
});
