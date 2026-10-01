-- Stripe is the source of truth for billing. This table is a projection of
-- Stripe webhook events used by TEI's RLS policies and UI; clients cannot
-- write billing state directly.

-- The former demo-only RPC allowed any authenticated user to self-upgrade.
-- Real subscription changes now arrive only through a verified Stripe webhook.
drop function if exists public.set_my_tier(public.tei_tier);

create table public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null unique references auth.users (id) on delete cascade,
  stripe_customer_id     text not null unique,
  stripe_subscription_id text not null unique,
  stripe_price_id        text,
  tier                   public.tei_tier not null check (tier in ('basic', 'premium')),
  status                 text not null check (status in (
    'incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due',
    'canceled', 'unpaid', 'paused'
  )),
  cancel_at_period_end   boolean not null default false,
  current_period_end     timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table public.subscriptions is
  'Server-maintained projection of the authenticated user''s Stripe subscription.';

create trigger subscriptions_touch_updated_at
  before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- Stripe retries webhooks. Recording event IDs gives the webhook an idempotent
-- database boundary instead of relying on delivery order or in-memory state.
create table public.stripe_events (
  id           text primary key,
  event_type   text not null,
  received_at  timestamptz not null default now()
);

comment on table public.stripe_events is
  'Deduplication record for verified Stripe webhook events.';

alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;

revoke all on public.subscriptions from anon, authenticated;
revoke all on public.stripe_events from anon, authenticated;

grant select on public.subscriptions to authenticated;

create policy "Users can read their own subscription"
  on public.subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);
