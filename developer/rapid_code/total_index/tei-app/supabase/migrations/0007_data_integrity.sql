-- Two integrity gaps an adversarial pass found. Both were reachable only by
-- calling the API directly; the UI already guards them.

-- 1. A Standard session could be saved with no strength inputs at all.
--    0004 relaxed the NOT NULLs so the other four calculators could omit them,
--    but nothing re-required them for the Standard model, so a 'standard' row
--    with NULL sets/rest/exertion inserted happily.
alter table public.sessions
  drop constraint if exists sessions_standard_requires_inputs;

alter table public.sessions
  add constraint sessions_standard_requires_inputs
  check (
    calculator <> 'standard'
    or (sets is not null
        and rest_seconds is not null
        and exertion_percent is not null)
  );

-- 2. A plan could be created for a date that has already passed.
--    Planning the past is meaningless. This is INSERT-only on purpose: an
--    existing plan must stay editable after its day rolls by, otherwise a user
--    could not correct yesterday's target.
create or replace function public.reject_past_plan()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.planned_for < current_date then
    raise exception 'Cannot plan a date in the past (%).', new.planned_for
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists plans_reject_past on public.plans;

create trigger plans_reject_past
  before insert on public.plans
  for each row execute function public.reject_past_plan();
