import { json, options, requireUser } from '../_shared/billing.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const preflight = options(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const user = await requireUser(req);
    const client = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
    );
    const { data, error } = await client
      .from('subscriptions')
      .select('tier, status, cancel_at_period_end, current_period_end, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    return json({ subscription: data });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Could not read subscription.' }, 400);
  }
});
