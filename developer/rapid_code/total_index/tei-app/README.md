# TEI — Total Effect Index (Prototype)

Navigable mobile prototype of the **RHINO ATHLETICS' Mission Simple — Total
Effect Index (TEI)** app, built from the client's PowerPoint mock-ups.

Scope for this phase: the **TEI Elemental (free) tier** is fully built and
navigable, including a working Standard Strength Training Calculator. **TEI
Basic** and **TEI Premium** are present as dummy buttons that surface an
"available on a paid tier" message, per the agreed prototype scope.

## Stack

React Native + Expo (SDK 57), TypeScript, expo-router. Runs on iOS, Android,
and web from one codebase.

## Running it

```bash
npm install
npm start          # then scan the QR code with Expo Go on your phone
```

Other targets:

```bash
npm run ios        # iOS simulator (requires Xcode)
npm run android    # Android emulator (requires Android Studio)
npm run web        # browser
npm run build:web  # static export to dist/ for sharing a link
```

The fastest way for a stakeholder to review this is `npm start` and scanning
the QR code with the **Expo Go** app.

## Backend (Supabase)

Auth and data are backed by a real Supabase project. Create your own `.env`
from the template before running:

```bash
cp .env.example .env   # then fill in the two values
```

| Variable | Purpose |
| -------- | ------- |
| `EXPO_PUBLIC_SUPABASE_URL` | Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |

Both are safe to ship in the app bundle — Row Level Security is what protects
the data. **The `service_role` key must never go in `.env`** or anywhere else
in the app: it bypasses RLS entirely and is trivially extracted from a mobile
binary. Keep it out of the repo and use it only for local admin scripts.

### Schema

`supabase/migrations/0001_init.sql` creates:

- **`profiles`** — one row per `auth.users` record: name, email, tier, accent
  colour. Created automatically on signup by the `handle_new_user()` trigger,
  which reads `first_name` / `last_name` / `tier` out of the signup metadata.
- **`sessions`** — one row per logged training session: the four calculator
  inputs plus the computed `tei`. The score is stored rather than recomputed so
  history stays stable if the formula is ever revised.

Apply it to a fresh project with:

```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/0001_init.sql
```

### Row Level Security

RLS is enabled on both tables, and every policy is scoped to
`auth.uid() = user_id`. A signed-in user can only ever read or write their own
rows; attempting to insert a row under another user's id fails with Postgres
error `42501`. Signed-out clients read nothing.

### One-time project setting

**Authentication → Sign In / Providers → Email → turn "Confirm email" OFF.**

Supabase enables email confirmation by default, which means signup returns no
session until the user clicks a link, and the built-in SMTP is rate-limited to
a few messages per hour — both of which get in the way of a click-through demo.
The app handles either setting correctly: with confirmation on, signup routes
to Log In with a "check your email" message instead of straight to Home.

## Accounts

There is no hardcoded user — sign up through the app to create a real account.
Signup writes to `auth.users`, the trigger creates the matching profile, and
the session persists across app restarts (AsyncStorage on native,
localStorage on web). Sign out from the bottom of the Profile screen.

## The TEI formula

Implemented in `src/lib/tei.ts`, taken from the client's two source documents:
*Standard Strength Training Calculator — Formula Cheat Sheet.pdf* and the
*Total Effect Index TEI — 5 Calculators.xlsx* workbook (sheet "Standard
Strength Training", cell `B93`).

```
TEI = (((Sets × 0.06) × RestValue) × ExertionDecimal + CardioValue) × 10
```

- **Sets** — raw count, multiplied by the index constant `0.06`
- **RestValue** — average rest seconds, plotted against the Rest dataset
- **ExertionDecimal** — perceived exertion percent ÷ 100
- **CardioValue** — total cardio minutes, plotted against the Cardio dataset

`RestValue` and `CardioValue` are **linearly interpolated** between the two
bracketing rows of their datasets, reproducing the workbook's `XLOOKUP`
formula rather than snapping to the nearest point. Values outside a dataset's
range clamp to the nearest endpoint.

**Reference case** (from the workbook, and the number shown in the mock-ups):

| Sets | Rest | Exertion | Cardio | TEI | Displayed |
| ---- | ---- | -------- | ------ | ----- | --------- |
| 11 | 60s | 80% | 41 min | 13.78 | **14** |

## Screens

Every screen maps to a numbered mock-up in the client's deck.

| Route | Mock-up |
| ----- | ------- |
| `/` | Screen 1 — Onboarding Launch (+ Screen 2 "What is TEI?" sheet) |
| `/login` | Screen 4 — Onboarding / Log In |
| `/account-type` | Screen 5 — Account Type Selection (+ Screen 6 "The 3 TEI" sheet) |
| `/create-account` | Screen 7 — Create TEI Elemental Account |
| `/loading` | Screen 12 — App Loading |
| `/home` | ELEMENTAL Screen 1 — Home |
| `/calculator` | ELEMENTAL Screen 2 — Standard Strength Training Calculator |
| `/entry/sets` | ELEMENTAL Screen 3 — Total Strength Training Sets |
| `/entry/rest` | ELEMENTAL Screen 4 — Average Rest Period |
| `/entry/exertion` | ELEMENTAL Screen 5 — Average % Exertion |
| `/entry/cardio` | ELEMENTAL Screen 6 — Total Cardio Volume |
| `/ranges` | ELEMENTAL Screen 7 — Effective TEI Ranges |
| `/profile` | ELEMENTAL Screen 8 — Edit Elemental Profile |
| `/review` | BASIC Screen 8 — Review TEI, monthly calendar (paid tiers) |

Everything except the launch, log in, account type and create account routes
requires a session; `AuthGate` in `app/_layout.tsx` redirects otherwise.

## Design tokens

From the deck's "Suggested Tokens" and colour-palette slides, in
`src/theme.ts`:

| Role | Value |
| ---- | ----- |
| Primary accent (orange) | `#FF8A25` |
| Secondary accent (green) | `#81D742` |
| Background | `#000000` |
| Surface | `#111111` |
| Text | `#FFFFFF` / `#DEDEDE` |
| Success | `#18A86B` |
| Border radius | `11px` |

## Prototype limitations

Deliberate, and matching the agreed scope:

- **Elemental saves no history.** That is the tier's design, not a gap: the
  calculator computes a score but does not write to `sessions`. Basic and
  Premium accounts do save, and the Review calendar reads them back.
- **No payments.** The Basic/Premium payment pop-ups (Screens 9 and 11) are not
  built, so there is no way to upgrade from inside the app. To exercise the
  paid-tier flows, set a profile's tier directly:
  `update public.profiles set tier = 'basic' where email = '…';`
- **Email is read-only on the Profile screen.** Changing it needs a
  confirmation round-trip that is not wired up.
- **No password reset.** The "Forgot password?" link shows a notice.
- **Premium-only UI** (progress gradients on rings, the 5 calculator formats,
  Plan/Workload designer) is not built.

## Source documents

- `../Mission Simple TEI App with 5 Calculators Outline-PRD Resource (1).pptx`
- `../Standard Strength Training Calculator - Formula Cheat Sheet.pdf`
- `../Total Effect Index TEI - 5 Calculators.xlsx`
- `../total-effect-index-tei-mobile-app-prototype-prd.pdf`
