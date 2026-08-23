-- Planned TEI targets (TEI Premium — Plan / Workload designer).
--
-- Kept separate from `sessions` on purpose: a plan is a target for a FUTURE
-- date, while a session is a record of training that actually happened. The
-- Review calendar colour-codes actuals against these targets, so conflating
-- the two would make "did I hit my plan?" unanswerable.

create table if not exists public.plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,

  /** The day being planned. Date, not timestamp: a plan is per-day. */
  planned_for date not null,

  /** Target score for that day. */
  tei         numeric(8, 2) not null check (tei >= 0),

  /** Which model the target was built with, mirroring sessions.calculator. */
  calculator  text not null default 'standard'
              check (calculator in ('standard','breakdown','circuit','cardio','yoga')),

  -- The variables behind the target, so the plan can be reopened and edited.
  sets             integer check (sets >= 0),
  rest_seconds     integer check (rest_seconds >= 0),
  exertion_percent integer check (exertion_percent between 0 and 100),
  cardio_minutes   integer check (cardio_minutes >= 0),
  breakdowns       integer check (breakdowns >= 0),
  exercises        integer check (exercises >= 0),
  circuits         integer check (circuits >= 0),
  yoga_minutes     integer check (yoga_minutes >= 0),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- One plan per day per user; re-planning a day overwrites it.
  unique (user_id, planned_for)
);

comment on table public.plans is
  'A planned/target TEI for a given day, distinct from a logged session.';

create index if not exists plans_user_planned_for_idx
  on public.plans (user_id, planned_for);

create trigger plans_touch_updated_at
  before update on public.plans
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: same ownership rule as every other table
-- ---------------------------------------------------------------------------

alter table public.plans enable row level security;

create policy "Users can read their own plans"
  on public.plans for select
  using ((select auth.uid()) = user_id);

-- Planning is a Premium feature, enforced server-side rather than only in the
-- UI, matching how sessions gates saving on a paid tier.
create policy "Premium can insert their own plans"
  on public.plans for insert
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.tier = 'premium'
    )
  );

create policy "Premium can update their own plans"
  on public.plans for update
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.tier = 'premium'
    )
  );

create policy "Users can delete their own plans"
  on public.plans for delete
  using ((select auth.uid()) = user_id);
