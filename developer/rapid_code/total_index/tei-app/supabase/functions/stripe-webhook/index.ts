import { adminClient, json, stripeGet, syncStripeSubscription, type StripeSubscription } from '../_shared/billing.ts';

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

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const payload = await req.text();
  if (!await verifyStripeSignature(payload, req.headers.get('Stripe-Signature'))) {
    return json({ error: 'Invalid Stripe webhook signature.' }, 400);
  }

  try {
    const event = JSON.parse(payload) as { id: string; type: string; data: { object: StripeSubscription & { mode?: string; subscription?: string } } };
    const admin = adminClient();
    const { data: existingEvent, error: existingEventError } = await admin
      .from('stripe_events')
      .select('id')
      .eq('id', event.id)
      .maybeSingle();
    if (existingEventError) throw existingEventError;
    if (existingEvent) return json({ received: true, duplicate: true });

    if (event.type === 'checkout.session.completed' && event.data.object.mode === 'subscription') {
      const subscriptionId = event.data.object.subscription;
      if (subscriptionId) await syncStripeSubscription(await stripeGet(`subscriptions/${subscriptionId}`));
    } else if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      await syncStripeSubscription(event.data.object);
    }

    // Record the event only after the Stripe state is safely reflected in TEI.
    // Otherwise a transient sync failure would make every Stripe retry look
    // like a duplicate and permanently skip the account update.
    const { error: eventError } = await admin
      .from('stripe_events')
      .insert({ id: event.id, event_type: event.type });
    if (eventError?.code === '23505') return json({ received: true, duplicate: true });
    if (eventError) throw eventError;

    return json({ received: true });
  } catch (error) {
    // Return a non-2xx response so Stripe retries a transient database/API failure.
    return json({ error: error instanceof Error ? error.message : 'Webhook processing failed.' }, 500);
  }
});
