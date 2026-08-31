-- Premium's Edit Profile screen adds a Theme choice (Dark / Light) alongside
-- the accent-colour swatches. `accent_color` already exists (0001) and is
-- already client-writable (0002); the theme preference had nowhere to live.
--
-- Like accent_color this is a pure display preference, so it is safe to let
-- the client write it directly. The 0002/0003 `protect_profile_columns()`
-- trigger pins only id/email/tier, so it does not interfere with this column.

-- ---------------------------------------------------------------------------
-- profiles.theme
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tei_theme') then
    create type public.tei_theme as enum ('dark', 'light');
  end if;
end
$$;

alter table public.profiles
  add column if not exists theme public.tei_theme not null default 'dark';

comment on column public.profiles.theme is
  'Premium-only display preference. The app is dark by default.';

-- 0002 revoked UPDATE on the whole table and re-granted it column by column.
-- A new column is therefore NOT writable until it is named here, so this
-- restates the full grant list rather than adding to it (column grants are
-- additive, but keeping one authoritative list makes the writable surface
-- readable in one place).
grant update (first_name, last_name, accent_color, theme)
  on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- accent_color: constrain to a hex triple
-- ---------------------------------------------------------------------------

-- The column is client-writable and read straight back into a style prop, so
-- keep it to something that can only ever be a colour.
alter table public.profiles
  drop constraint if exists profiles_accent_color_is_hex;

alter table public.profiles
  add constraint profiles_accent_color_is_hex
  check (accent_color ~* '^#[0-9a-f]{6}$');
