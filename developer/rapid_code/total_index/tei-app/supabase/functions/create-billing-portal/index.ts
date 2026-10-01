import { adminClient, json, options, requireUser, stripeForm, validReturnUrl } from '../_shared/billing.ts';

Deno.serve(async (req) => {
  const preflight = options(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const { returnUrl } = await req.json();
    if (!validReturnUrl(returnUrl)) return json({ error: 'Invalid billing return URL.' }, 400);
    const user = await requireUser(req);
    const { data: subscription, error } = await adminClient()
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (!subscription) return json({ error: 'No Stripe subscription was found for this account.' }, 404);

    const portal = await stripeForm('billing_portal/sessions', new URLSearchParams({
      customer: subscription.stripe_customer_id,
      return_url: returnUrl,
    }));
    return json({ portalUrl: portal.url });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Could not open billing.' }, 400);
  }
});
