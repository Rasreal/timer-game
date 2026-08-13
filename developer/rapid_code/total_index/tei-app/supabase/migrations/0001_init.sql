-- TEI — Total Effect Index
-- Initial schema: user profiles and logged training sessions.
--
-- Auth itself is handled by Supabase's built-in `auth.users` table. This
-- migration adds the app-specific data that hangs off it.

-- ---------------------------------------------------------------------------
-- Subscription tiers
-- ---------------------------------------------------------------------------

create type public.tei_tier as enum ('elemental', 'basic', 'premium');

-- ---------------------------------------------------------------------------
-- profiles — one row per auth user
-- ---------------------------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  first_name  text        not null default '',
  last_name   text        not null default '',
  email       text        not null,
  tier        public.tei_tier not null default 'elemental',
  -- Paid tiers let the user pick an accent colour; Elemental is always orange.
  accent_color text       not null default '#FF8A25',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'App profile for each authenticated user, 1:1 with auth.users.';

-- ---------------------------------------------------------------------------
-- sessions — one row per logged training session
-- ---------------------------------------------------------------------------

create table public.sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,

  -- When the training session took place (user-selected, not insert time).
  performed_at timestamptz not null,

  -- The four Standard Strength Training Calculator inputs.
  sets             integer not null check (sets >= 0),
  rest_seconds     integer not null check (rest_seconds >= 0),
  exertion_percent integer not null check (exertion_percent between 0 and 100),
  cardio_minutes   integer not null check (cardio_minutes >= 0),

  -- The computed score. Stored so history stays stable even if the formula
  -- is revised later; `tei` is the raw value, e.g. 13.78.
  tei          numeric(8, 2) not null check (tei >= 0),

  -- Which calculator produced this score. Only the standard model exists
  -- today; TEI Premium adds four more formats.
  calculator   text not null default 'standard',

  created_at   timestamptz not null default now()
);

comment on table public.sessions is
  'A logged training session and its calculated Total Effect Index.';

-- Review screens page through a user''s sessions newest-first.
create index sessions_user_performed_at_idx
  on public.sessions (user_id, performed_at desc);

-- ---------------------------------------------------------------------------
-- Keep profiles.updated_at current
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Create a profile automatically whenever someone signs up
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
-- Pinned search_path: this runs as the definer, so an attacker-controlled
-- search_path must not be able to redirect these writes.
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, first_name, last_name, email, tier)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.email,
    coalesce(
      (new.raw_user_meta_data ->> 'tier')::public.tei_tier,
      'elemental'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security — every user sees only their own rows
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.sessions enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Insert is normally handled by the signup trigger; this covers the case of
-- a profile being created client-side for an already-authenticated user.
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check ((select auth.uid()) = id);

create policy "Users can read their own sessions"
  on public.sessions for select
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own sessions"
  on public.sessions for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own sessions"
  on public.sessions for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own sessions"
  on public.sessions for delete
  using ((select auth.uid()) = user_id);
