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
- `set_my_tier` was a prototype-only demo RPC. Migration `0009` removes it;
  do not restore any client-controlled entitlement update.
- Elemental accounts intentionally do not persist session history. Paid tiers
  do.
- Review is tiered: Basic can inspect neutral monthly saved scores and weekly
  totals; Premium also receives planned-target colors, saved-session details,
  and current week/month/quarter/semi-annual/year aggregate valuation.

## Billing

- Stripe-hosted Checkout runs in `app/subscribe.tsx`; it does not collect card
  data in TEI. `src/lib/billing.ts` calls authenticated Supabase Edge
  Functions to create Checkout and Billing Portal sessions.
- `0009_stripe_subscriptions.sql` removes the demo `set_my_tier` RPC. A
  verified Stripe webhook is the only way to change a user's paid entitlement;
  it projects the provider state into `subscriptions` and `profiles.tier`.
- Edge Function secrets live in ignored `supabase/functions/.env` locally and
  in Supabase Edge Function Secrets in production. Never put `STRIPE_SECRET_KEY`
  or webhook secrets in a client environment variable. Deployment steps are in
  [STRIPE_SUBSCRIPTIONS_SETUP.md](STRIPE_SUBSCRIPTIONS_SETUP.md).

## Current product boundaries

- Stripe test-mode billing is implemented in the repository but awaits the
  one-time Supabase project-owner deployment described in the Stripe setup
  document; do not represent it as live until the webhook test succeeds.
- Email change confirmation and date picking are not implemented.
- The app has thorough unit/screen coverage, but a device test and a real
  Supabase recovery-email test remain necessary before release.
