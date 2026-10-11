import { createClient } from 'npm:@supabase/supabase-js@2';

export type PaidTier = 'basic' | 'premium';

export type StripeSubscription = {
  id: string;
  customer: string;
  status: string;
  cancel_at_period_end?: boolean;
  current_period_end?: number | null;
  metadata?: Record<string, string>;
  items?: { data?: Array<{ price?: { id?: string } }> };
};

export type SyncedSubscription = {
  tier: PaidTier;
  status: string;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  updated_at: string;
};

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function options(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response('ok', { headers: corsHeaders }) : null;
}

export function getServiceKey(): string {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;

  const keys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (keys) {
    const parsed = JSON.parse(keys) as Record<string, string>;
    const key = parsed.default ?? Object.values(parsed)[0];
    if (key) return key;
  }
  throw new Error('Supabase service key is not available to this Edge Function.');
}

export function adminClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, getServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireUser(req: Request) {
  const authorization = req.headers.get('Authorization');
  if (!authorization) throw new Error('Sign in is required.');

  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authorization } } },
  );
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error('Your session is no longer valid. Please sign in again.');
  return data.user;
}

export function isPaidTier(value: unknown): value is PaidTier {
  return value === 'basic' || value === 'premium';
}

export async function stripeForm(path: string, form: URLSearchParams) {
  const secret = Deno.env.get('STRIPE_SECRET_KEY');
  if (!secret) throw new Error('Stripe is not configured.');

  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? 'Stripe could not process this request.');
  }
  return payload;
}

export async function stripeGet(path: string) {
  const secret = Deno.env.get('STRIPE_SECRET_KEY');
  if (!secret) throw new Error('Stripe is not configured.');

  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? 'Stripe could not retrieve this subscription.');
  }
  return payload;
}

/**
 * Project a Stripe subscription into TEI's server-owned billing records.
 *
 * The webhook uses this for every provider event. Checkout confirmation uses
 * the same path after it has fetched the session from Stripe and verified that
 * it belongs to the authenticated TEI user. Keeping this server-side means a
 * client can never grant itself a tier.
 */
export async function syncStripeSubscription(subscription: StripeSubscription): Promise<SyncedSubscription> {
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

  if (!userId || !isPaidTier(tier)) {
    throw new Error('Subscription has no TEI user or plan metadata.');
  }

  const status = subscription.status;
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;
  const { data: synced, error: upsertError } = await admin.from('subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: subscription.customer,
    stripe_subscription_id: subscription.id,
    stripe_price_id: subscription.items?.data?.[0]?.price?.id ?? null,
    tier,
    status,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    current_period_end: currentPeriodEnd,
  }, { onConflict: 'user_id' }).select('tier, status, cancel_at_period_end, current_period_end, updated_at').single();
  if (upsertError) throw upsertError;

  const active = status === 'active' || status === 'trialing';
  const { error: profileError } = await admin
    .from('profiles')
    .update({ tier: active ? tier : 'elemental' })
    .eq('id', userId);
  if (profileError) throw profileError;

  return synced;
}

export function validReturnUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    if (url.protocol === 'tei:') return true;
    const allowedOrigins = (Deno.env.get('STRIPE_RETURN_ORIGINS') ?? 'https://tei-app-blue.vercel.app')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    return allowedOrigins.includes(url.origin);
  } catch {
    return false;
  }
}
