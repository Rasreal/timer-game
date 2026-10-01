import { createClient } from 'npm:@supabase/supabase-js@2';

export type PaidTier = 'basic' | 'premium';

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
