import {
  adminClient,
  isPaidTier,
  json,
  options,
  requireUser,
  stripeForm,
  validReturnUrl,
} from '../_shared/billing.ts';

Deno.serve(async (req) => {
  const preflight = options(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const { tier, successUrl, cancelUrl } = await req.json();
    if (!isPaidTier(tier)) return json({ error: 'Choose TEI Basic or Premium.' }, 400);
    if (!validReturnUrl(successUrl) || !validReturnUrl(cancelUrl)) {
      return json({ error: 'Invalid checkout return URL.' }, 400);
    }

    const user = await requireUser(req);
    const admin = adminClient();
    const { data: existing, error: existingError } = await admin
      .from('subscriptions')
      .select('stripe_customer_id, status')
      .eq('user_id', user.id)
      .maybeSingle();
    if (existingError) throw existingError;

    if (existing && ['active', 'trialing', 'past_due'].includes(existing.status)) {
      return json({ error: 'You already have a subscription. Use Manage billing to change it.' }, 409);
    }

    const priceId = tier === 'basic'
      ? Deno.env.get('STRIPE_BASIC_PRICE_ID')
      : Deno.env.get('STRIPE_PREMIUM_PRICE_ID');
    if (!priceId) throw new Error(`Stripe price for TEI ${tier} is not configured.`);

    const form = new URLSearchParams({
      mode: 'subscription',
      success_url: `${successUrl}${successUrl.includes('?') ? '&' : '?'}stripe_checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${cancelUrl}${cancelUrl.includes('?') ? '&' : '?'}stripe_checkout=cancel`,
      client_reference_id: user.id,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'subscription_data[metadata][supabase_user_id]': user.id,
      'subscription_data[metadata][tei_tier]': tier,
      'metadata[supabase_user_id]': user.id,
      'metadata[tei_tier]': tier,
    });

    if (existing?.stripe_customer_id) form.set('customer', existing.stripe_customer_id);
    else if (user.email) form.set('customer_email', user.email);

    const session = await stripeForm('checkout/sessions', form);
    return json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Could not start checkout.' }, 400);
  }
});
