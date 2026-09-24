# TEI project memory

This is the concise operating context for future work on the TEI app.

## What this is

- Expo Router / React Native app for iOS, Android, and web; entry point and
  global auth gate live in `app/_layout.tsx`.
- Supabase owns identity and the persistent `profiles`, `sessions`, and
  `plans` data. The client uses only the public URL and anon key from `.env`.
- The training-score implementation in `src/lib/tei.ts` reproduces the client
  workbook, not the simplified PDF. Preserve its verification cases.

## Useful commands

```bash
npx tsc --noEmit
npm test -- --runInBand
npm run verify
npm run build:web
```

`npm test` also writes an ignored HTML report under `test-report/`.

## Authentication model

- `src/auth.tsx` is the single client-facing auth API. Put Supabase auth calls
  there instead of wiring them directly into a screen.
- `AuthGate` protects every route except onboarding, login, account creation,
  loading, and the two password-reset routes.
- Signup metadata feeds the `handle_new_user` database trigger; do not create a
  separate client-side profile insert.
- The profile read retries briefly because the trigger can lag a newly created
  auth user.
- Password recovery is two-stage: `/forgot-password` sends a recovery email;
  `/reset-password` restores the temporary Supabase session from a PKCE `code`
  or implicit-flow hash tokens, changes the password, then signs that temporary
  session out. The parser is deliberately manual because the shared client has
  `detectSessionInUrl: false` for native compatibility.
- `app.json` registers the `tei://` scheme. Details of the required dashboard
  allowlist and email setup are in [SUPABASE_SETUP.md](SUPABASE_SETUP.md).
- The current web deployment is `https://tei-app-blue.vercel.app`; keep its
  `/reset-password` route in Supabase's Redirect URL allowlist.

## Data and security invariants

- Run migrations in numeric order; do not edit an applied migration. Add a new
  migration for schema or policy changes.
- Keep Row Level Security enabled. The mobile app must never contain a
  `service_role`/secret key.
- `set_my_tier` exists only to demo tiers without billing. Remove it before a
  production launch and move entitlement updates to a trusted payment webhook.
- Elemental accounts intentionally do not persist session history. Paid tiers
  do.

## Current product boundaries

- No real billing or entitlement source exists yet.
- Email change confirmation and date picking are not implemented.
- The app has thorough unit/screen coverage, but a device test and a real
  Supabase recovery-email test remain necessary before release.
