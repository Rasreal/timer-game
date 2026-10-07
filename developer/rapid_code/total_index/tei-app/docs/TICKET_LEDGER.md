# TEI ticket and fix ledger

This ledger records the known TEI tickets and delivered fixes in the repository. Ticket IDs are used where they were supplied; related work without a ticket ID is listed by capability.

| Item | Status | Delivered behavior | Primary evidence |
| --- | --- | --- | --- |
| TEI-11 User Auth Backend and Database Session Management | Complete | Supabase Auth handles sign-up, sign-in, password changes, persisted sessions, profile creation, and row-level data isolation. | `docs/TEI-11_AUTH_BACKEND_AUDIT.md`, `src/auth.tsx`, migrations `0001` and `0002` |
| TEI-12 Save Feature and Workout Data Persistence | Complete | Basic and Premium sessions save calculator inputs, TEI, date, and timestamp; review reads and sums persisted sessions. | `src/lib/sessions.ts`, `supabase/migrations/0004_calculator_variables.sql`, `__tests__/workout-persistence-flow.test.ts` |
| Password recovery | Complete in app; Supabase email setup required | Recovery email request and reset-link password update work in the client. Production delivery requires configured redirect URLs and SMTP. | `app/forgot-password.tsx`, `app/reset-password.tsx`, `docs/SUPABASE_SETUP.md` |
| Stripe subscriptions | Implemented; external deployment required | Hosted Stripe Checkout, billing portal, subscription projection, and verified webhook are in the repository. Supabase Edge Functions and Stripe webhook setup remain owner-managed deployment work. | `app/subscribe.tsx`, `supabase/functions/`, `docs/STRIPE_SUBSCRIPTIONS_SETUP.md` |
| Subscription tier access | Complete | Paid routes and calculator capabilities are gated by tier; user-controlled demo tier switching was removed from the production billing migration. | `src/auth.tsx`, `app/plan.tsx`, migration `0009_stripe_subscriptions.sql` |
| Calendar and History Aggregates | Complete | Monthly review, saved-session details, plan-relative Premium grading, weekly totals, and current timeframe aggregates are available. | `app/review.tsx`, `app/review-timeframe.tsx`, `src/lib/review.ts` |
| TEI-19 Monthly Review Calendar UI with Workout Indicator Dots | Complete | A distinct accent indicator dot appears only on dates with one or more saved sessions. It preserves the score circle, handles multiple sessions as one marked day, and leaves rest and future unsaved days unmarked. | `app/review.tsx`, `__tests__/main/review.test.tsx` |
| Launcher icon and branding | Complete | Native launcher icons and in-app wordmark use supplied RA artwork. | `app.json`, `assets/`, commit `35742d00e8` |
| iOS build version | Complete | iOS build version is 1.0.0 (2). | `app.json`, commit `ed8cfa70b2` |

## TEI-19 acceptance criteria

- The Review screen is an iCal-style month grid with month navigation.
- A visible indicator dot appears only on a day with at least one persisted workout session.
- Multiple sessions on the same day still produce one indicator and a summed daily TEI score.
- Rest days and future unsaved days do not show an indicator.
- The existing weekly selection and total calculation continue to work.

## Release checks outside ticket completion

- Deploy the Stripe Edge Functions and configure the Stripe webhook before accepting real subscription payments.
- Configure Supabase Auth redirect URLs and a production SMTP sender before relying on password-recovery emails.
- Run a signed-in iOS and Android smoke test against the production Supabase project before store release.

## TEI-19 verification

- TypeScript: `npx tsc --noEmit`
- Automated app suite: 38 suites and 1,173 tests passed, including the saved-day indicator, multiple-session, weekly-total, persistence, and timeframe-review flows.
- Formula regression checks: `npm run verify` passed against all five workbook calculators and the grading boundaries.
- Production web bundle: `npm run build:web` exported successfully.
