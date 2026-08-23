-- Support the four additional TEI Premium calculators.
--
-- The `sessions` table was shaped for the Standard Strength model alone. The
-- other calculators use different variables: Breakdown adds breakdowns-per-set,
-- Circuit swaps sets/rest for exercises + circuits, Cardio ONLY uses just
-- cardio minutes, and Yoga adds yoga minutes and drops rest entirely.
--
-- The extra columns are nullable because each calculator only fills its own.

alter table public.sessions
  add column if not exists breakdowns    integer check (breakdowns >= 0),
  add column if not exists exercises     integer check (exercises >= 0),
  add column if not exists circuits      integer check (circuits >= 0),
  add column if not exists yoga_minutes  integer check (yoga_minutes >= 0);

-- The Standard model requires these; the others may legitimately omit them,
-- so relax the original NOT NULLs.
alter table public.sessions
  alter column sets             drop not null,
  alter column rest_seconds     drop not null,
  alter column exertion_percent drop not null;

-- `calculator` already exists and defaults to 'standard'. Constrain it to the
-- five known models so a typo cannot silently create a sixth.
alter table public.sessions
  drop constraint if exists sessions_calculator_check;

alter table public.sessions
  add constraint sessions_calculator_check
  check (calculator in ('standard','breakdown','circuit','cardio','yoga'));

comment on column public.sessions.calculator is
  'Which of the five TEI models produced this score.';
