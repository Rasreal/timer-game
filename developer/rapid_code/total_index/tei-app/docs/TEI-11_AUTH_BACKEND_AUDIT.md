# TEI-11 — User Auth Backend & Database Session Management

Audit date: 2026-09-25

## Decision

**Implemented with Supabase Auth.** TEI deliberately has no custom
authentication server or locally-defined REST routes. The Expo client invokes
the hosted Supabase Auth API through `@supabase/supabase-js`; Supabase owns the
credential store, password hashing and server-side session records. That is the
correct boundary for this mobile/web client: no database credential or
privileged key is shipped in the app.

The implementation satisfies TEI-11 as a managed-auth implementation. It is
not an implementation of a separate bespoke API service.

## Requirement traceability

| Ticket requirement | Implementation and evidence |
| --- | --- |
| Authentication API | `src/auth.tsx` is the sole app-facing auth layer. It calls Supabase for email/password sign-up, password sign-in, sign-out, recovery-email delivery and password update. Supabase hosts the corresponding Auth API; screens do not call it directly. |
| User table | Supabase-managed `auth.users` is the identity table. `supabase/migrations/0001_init.sql` adds public `profiles`, keyed 1:1 to `auth.users(id)` with `ON DELETE CASCADE`. The `on_auth_user_created` trigger creates the profile at sign-up. |
| Password hashing | Passwords never enter an app database table or app-side hash function. Supabase Auth stores only salted bcrypt hashes in `auth.users`; see Supabase's [password security documentation](https://supabase.com/docs/guides/auth/password-security). |
| Session token persistence | `src/lib/supabase.ts` enables `persistSession` and `autoRefreshToken`. Native builds use `AsyncStorage`; web uses Supabase's browser storage default. `AuthProvider` restores the stored session with `getSession()` and stays synchronized with `onAuthStateChange`. On native, refresh runs only while the app is active. |
| Access isolation | `profiles`, `sessions` and `plans` use RLS. Profile and workout policies scope rows to `auth.uid()`, while later migrations restrict writable profile columns and paid-session writes. |

## Authentication and session flow

```text
Sign up / sign in
  → Supabase Auth creates or validates auth.users
  → auth.users insert trigger creates public.profiles
  → Supabase returns JWT access token + rotating refresh token
  → client persists session and restores it on the next launch
  → RLS evaluates auth.uid() for app-data requests

Sign out / password reset
  → client calls Supabase Auth
  → Auth session is invalidated or replaced server-side
  → AuthProvider receives the state event and removes local app state
```

Supabase documents that a session has an access-token JWT and a one-time-use
refresh token, with the server-side record in `auth.sessions`.
[Session documentation](https://supabase.com/docs/guides/auth/sessions)
describes the lifecycle and available expiration controls.

## Security review

- The app reads only `EXPO_PUBLIC_SUPABASE_URL` and
  `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Its database password is not read by the
  application and must never be embedded in a build or committed. Move local
  database/admin credentials to a workstation or deployment-secret store, not
  an app configuration file shared with mobile tooling.
- `0006_fix_signup_tier.sql` overrides attacker-controlled sign-up metadata
  and creates every profile as `elemental`. This closes a free-premium path.
- `0002_harden_rls.sql` removes direct tier changes and limits profile writes;
  `0008_profile_theme.sql` extends the permitted preference columns.
- `0003_prototype_tier_switch.sql` intentionally exposes `set_my_tier` to any
  authenticated user for demos. **It is a launch blocker:** remove it and have
  a trusted billing webhook set entitlements before accepting payments.
- Password policy is enforced in both places: the UI currently requires at
  least eight characters, a number and an uppercase letter; configure equal or
  stronger requirements in Supabase Auth. Supabase recommends at least eight
  characters and supports required character classes and leaked-password
  protection. [Password policy guidance](https://supabase.com/docs/guides/auth/password-security)
- RLS remains necessary even with an anon key. Supabase recommends enabling
  RLS on every exposed table and pairing policies with appropriate grants.
  [RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security)

## Verification performed

Non-mutating live checks against the configured Supabase project returned HTTP
200 for the public Auth settings endpoint and an anonymous `profiles` REST
read. The latter verifies that the deployed public table endpoint is reachable;
it does not expose or inspect another user's data and does not prove every
migration's ledger entry.

Local automated coverage includes:

- session restoration, auth-state subscription and cleanup;
- profile-trigger race retry and user-scoped profile query;
- successful and failed sign-in/sign-out;
- sign-up confirmation and duplicate-account behavior;
- recovery redirect delivery, recovery password update and temporary-session
  sign-out; and
- authenticated profile/password changes and tier-RPC failure handling.

On 2026-09-25, `npx tsc --noEmit`, the full Jest suite (**34 suites, 1,154
tests**), `npm run verify`, and `npm run build:web` all passed. A release also
needs a manual device test with a real user: create an account, close/reopen
the app, sign out/in, recover the password, and confirm a second user cannot
access the first user's profile or workout data.

## Deployment checklist

1. Apply every SQL file in `supabase/migrations/` in numeric order and verify
   the migration history in the Supabase dashboard/CLI.
2. Keep Email Auth enabled. Configure the password policy, confirmation
   setting, rate limits and session limits in **Authentication** settings.
3. Configure production SMTP and the reset URL allowlist documented in
   [SUPABASE_SETUP.md](SUPABASE_SETUP.md). Supabase's default email sender is
   development-only and restricted.
4. Replace the prototype `set_my_tier` RPC with a server-side payment webhook
   before billing or production entitlements are enabled.
5. Do not add `service_role`, database passwords, SMTP credentials or JWT
   signing secrets to Expo environment variables with the `EXPO_PUBLIC_`
   prefix.

## Scope note

The account-type screen still sends the selected tier as sign-up metadata, but
the hardened trigger correctly ignores it and starts every user on Elemental.
This is intentional for security; paid enrollment must be performed only by
the prototype tier switcher during demos or, in production, a trusted billing
system. The screen copy/paid onboarding should be revised before launch so it
does not imply that selecting Basic or Premium at account creation completes a
purchase.
