-- Close a free-Premium hole in the signup path.
--
-- handle_new_user() read `tier` out of raw_user_meta_data, which is populated
-- verbatim from the PUBLIC signup endpoint's `options.data`. One call —
--     signUp({ email, password, options: { data: { tier: 'premium' } } })
-- — created a profile that was BORN premium, bypassing every protection added
-- in 0002 (column grants) and 0003 (the set_my_tier funnel). Those guard the
-- UPDATE path; nothing guarded INSERT.
--
-- Verified before the fix: the attacker's profile came back tier='premium' and
-- immediately inserted into the Premium-only `plans` table.
--
-- Tier is now always 'elemental' at signup. Changing it must go through
-- set_my_tier (prototype) or, in production, a payment webhook using the
-- service_role key. Name and email are still read from metadata: those are the
-- user's own data to set, and carry no entitlement.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, first_name, last_name, email, tier)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.email,
    -- Deliberately NOT from metadata: that is attacker-controlled.
    'elemental'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
