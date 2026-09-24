# App audit — 2026-09-25

## Scope and result

Reviewed the Expo routes, auth layer, Supabase client configuration, database
migrations, calculator/session paths, and automated test suite. The app has a
coherent client-side architecture: protected routes are centralized in the auth
gate, profile access is RLS-oriented, and calculator math has reference and
edge-case verification.

The password-reset gap has been closed in this change. The new flow is tested
at the auth API and screen level, supports native deep links and web returns,
and does not reveal whether a supplied email is registered.

## Checks to run before a release

```bash
npx tsc --noEmit
npm test -- --runInBand
npm run verify
npm run build:web
```

These validate TypeScript, screen/auth behavior, formula reference cases and
edge cases, and static-web compilation. They cannot validate an actual Supabase
email delivery or a real mobile operating system's deep-link handoff, so perform
the five-step live test in [SUPABASE_SETUP.md](SUPABASE_SETUP.md) as a release
gate.

## Findings that still need product/backend work

| Priority | Finding | Recommended owner/action |
| --- | --- | --- |
| High before production | The prototype's `set_my_tier` RPC lets a signed-in user choose Basic or Premium without payment. | Backend: remove the RPC and assign tiers only from a trusted billing webhook. |
| High before recovery release | Supabase redirect allowlist and real SMTP are external configuration. | Project owner: complete [SUPABASE_SETUP.md](SUPABASE_SETUP.md), then test on iOS, Android, and web. |
| Medium | Email change remains intentionally read-only. | Product/backend: implement a confirmation-route flow when email editing is in scope. |
| Medium | Calendar/planner dates are constrained by prototype behavior. | Product: add a date picker and define timezone/date semantics before relying on plans in production. |
| Medium | No real payments/entitlements exist. | Backend/product: select billing provider and design webhook, retries, cancellation, and entitlement reconciliation. |

There are no new schema changes or relaxed RLS policies in this password-reset
implementation.
