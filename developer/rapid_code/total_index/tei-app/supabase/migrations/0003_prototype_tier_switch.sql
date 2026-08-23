-- Prototype-only: let a user switch their own subscription tier without
-- paying, so all three tiers can be demoed.
--
-- 0002 deliberately revoked UPDATE on profiles.tier, because a directly
-- writable tier column is a paid-feature bypass. That protection stays: the
-- column is still not writable from the client. Instead this adds ONE narrow,
-- audited entry point that can only ever set the tier and nothing else.
--
-- ============================ REMOVE BEFORE LAUNCH ========================
-- When billing is added, drop this function and drive `tier` from the payment
-- webhook using the service_role key. Leaving it in production would let any
-- user grant themselves Premium for free.
-- =========================================================================

-- The 0002 guard trigger pins `tier` to its old value on every client-side
-- update. This function is the one sanctioned exception, so it flags itself
-- with a transaction-local setting that the trigger honours.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_setting('role', true) is distinct from 'service_role'
     and auth.uid() is not null then
    new.id    := old.id;
    new.email := old.email;
    -- Only set_my_tier() may change the tier, and only for the caller.
    if coalesce(current_setting('app.allow_tier_change', true), '') <> 'on' then
      new.tier := old.tier;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.set_my_tier(new_tier public.tei_tier)
returns public.profiles
language plpgsql
security definer
-- Pinned: this runs as the definer, so the search_path must not be
-- attacker-controllable.
set search_path = public, pg_temp
as $$
declare
  updated public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Lift the guard for this statement only. `true` scopes the setting to the
  -- current transaction, so it cannot leak into any other write.
  perform set_config('app.allow_tier_change', 'on', true);

  -- SECURITY DEFINER bypasses the column grant, so scope the write tightly:
  -- only the caller's own row, only the tier column.
  update public.profiles
     set tier = new_tier
   where id = auth.uid()
  returning * into updated;

  perform set_config('app.allow_tier_change', 'off', true);

  if not found then
    raise exception 'No profile for the current user';
  end if;

  return updated;
end;
$$;

comment on function public.set_my_tier is
  'PROTOTYPE ONLY: self-service tier switch with no payment. Remove once '
  'billing exists and drive tier from the payment webhook instead.';

revoke all on function public.set_my_tier(public.tei_tier) from public, anon;
grant execute on function public.set_my_tier(public.tei_tier) to authenticated;
