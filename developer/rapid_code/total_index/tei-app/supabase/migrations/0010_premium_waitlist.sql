-- TEI Premium is in development. Instead of selling it, the Account Type
-- screen and "The 3 TEI" sheet offer a waitlist. Sign-up visitors can join
-- before they have an account, so the entry point accepts anonymous callers.
--
-- Clients never touch the table directly: one SECURITY DEFINER function
-- validates and records the request, and nobody but the service role can
-- read the list back (it is a list of email addresses).

create table public.premium_waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null check (
    length(email) <= 254 and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  name        text not null default '' check (length(name) <= 120),
  -- Set when the request came from a signed-in account.
  user_id     uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

comment on table public.premium_waitlist is
  'People who asked to be told when TEI Premium launches.';

-- One row per address, whatever its casing.
create unique index premium_waitlist_email_key
  on public.premium_waitlist (lower(email));

alter table public.premium_waitlist enable row level security;
revoke all on public.premium_waitlist from anon, authenticated;

create or replace function public.join_premium_waitlist(
  waitlist_email text,
  waitlist_name text default ''
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  clean_email text := lower(trim(coalesce(waitlist_email, '')));
  clean_name  text := left(trim(coalesce(waitlist_name, '')), 120);
begin
  if clean_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or length(clean_email) > 254 then
    raise exception 'Enter a valid email address.' using errcode = '22023';
  end if;

  -- Joining twice is not an error, and it must not reveal whether an address
  -- is already listed. A later request may add a name or link the account.
  insert into public.premium_waitlist (email, name, user_id)
  values (clean_email, clean_name, auth.uid())
  on conflict (lower(email)) do update
    set name    = case when excluded.name <> '' then excluded.name
                       else premium_waitlist.name end,
        user_id = coalesce(premium_waitlist.user_id, excluded.user_id);
end;
$$;

revoke all on function public.join_premium_waitlist(text, text) from public;
grant execute on function public.join_premium_waitlist(text, text)
  to anon, authenticated;
