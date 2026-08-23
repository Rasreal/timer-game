-- Harden RLS: stop users editing their own tier, and enforce the paid-tier
-- gate for saving history in the database rather than only in the UI.
--
-- Postgres RLS cannot scope an UPDATE policy to particular columns, so the
-- 0001 policy ("users can update their own profile") let a user rewrite ANY
-- column of their own row — including `tier`. One anon-key call was enough to
-- self-upgrade to premium and unlock every paid feature. Column privileges are
-- checked before RLS, so revoking them is the fix.

-- ---------------------------------------------------------------------------
-- profiles: only the user-editable columns stay writable by the client
-- ---------------------------------------------------------------------------

revoke update on public.profiles from anon, authenticated;

grant update (first_name, last_name, accent_color)
  on public.profiles to authenticated;

-- Belt and braces: even if a column grant is widened by accident later, this
-- trigger keeps identity and billing columns immutable from the client. It is
-- SECURITY INVOKER, so the service_role path (which bypasses RLS and runs as
-- a different role) can still legitimately change tier for billing.
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
    new.tier  := old.tier;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ---------------------------------------------------------------------------
-- sessions: saving history is a paid-tier feature, enforced server-side
-- ---------------------------------------------------------------------------

-- The 0001 insert policy only checked row ownership, so an Elemental account
-- could persist sessions by calling the REST API directly.
drop policy if exists "Users can insert their own sessions" on public.sessions;

create policy "Paid tiers can insert their own sessions"
  on public.sessions for insert
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.tier <> 'elemental'
    )
  );

drop policy if exists "Users can update their own sessions" on public.sessions;

create policy "Paid tiers can update their own sessions"
  on public.sessions for update
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.tier <> 'elemental'
    )
  );
