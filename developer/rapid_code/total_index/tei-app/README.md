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

### Planned vs logged

`plans` holds a **target** TEI for a future day; `sessions` holds what actually
happened. They are deliberately separate tables — conflating them would make
"did I hit my plan?" unanswerable. `gradeAgainstPlan()` in `src/lib/tei.ts`
implements the workbook's colour-coding table for comparing the two (gray = no
plan, white = under 70%, yellow = 70-90%, green = 90-110%, red = over 110%).

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

## What "proof of concept" covers

The PRD scopes the calculator deliverable precisely:

> "a proof-of-concept implementation of **the Standard Strength Model**
> calculator" — "Implement proof-of-concept TEI calculator logic using the
> Standard Strength Model (sets, rest time, exertion %, cardio minutes)" —
> "**validate against sample inputs**"

and in the goals: "Scope Elemental (free) and Basic (subscription) tier flows
only, **defer Premium tier and advanced calculator models to Phase 2**".

So the contracted PoC is one calculator — Standard Strength — computing real
numbers and validated against the client's own worked example. Crucially it is
*not* mock content: "validate against sample inputs" rules that out.

All five models are now implemented anyway, because decoding the workbook once
made the other four cheap. Each is checked against its own sheet:

| Calculator | Workbook cell | Expected | Status |
| ---------- | ------------- | -------- | ------ |
| Standard | `B95` | 13.78 | ✅ |
| Breakdown | `B106` | 14.095 | ✅ |
| Circuit | `B116` | 14.15 | ✅ |
| Cardio ONLY | `B41` | 8.5 | ✅ |
| Yoga | `B84` | 14.3 | ✅ |

```bash
npm run verify        # both suites
npm run verify:tei    # the five workbook reference cases
npm run verify:edge   # dataset nodes, interpolation, clamping, monotonicity
```

**Why the spreadsheet and not the PDF.** The *Formula Cheat Sheet* PDF is a
client-facing summary: it uses coarse lookup bands ("1½ mins = 0.75") and omits
the final `× 10`. Building from it would produce scores wrong by a factor of
ten that still looked plausible. The `.xlsx` is the source of truth — it
interpolates continuously via `XLOOKUP`, which is what the app reproduces.

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
| `/session-type` | PREMIUM Screen 2 — 5 Types of Training Session Selector |
| `/calc/breakdown` | PREMIUM Screen 4 — Breakdown Strength Training |
| `/calc/circuit` | PREMIUM Screen 5 — Circuit Strength Training |
| `/calc/yoga` | PREMIUM Screen 6 — YOGA Training |
| `/calc/cardio` | PREMIUM Screen 7 — Cardio ONLY Training |
| `/entry/breakdowns` | PREMIUM Screen 12 — Average Breakdowns per Set |
| `/entry/exercises` | PREMIUM Screen 13 — Average Exercises per Circuit |
| `/entry/circuits` | PREMIUM Screen 14 — Total Number of Circuits |
| `/entry/yoga` | PREMIUM Screen 15 — Total Minutes of YOGA |
| `/plan` | PREMIUM Screen 20 — Plan TEI, monthly calendar |
| `/planner` | PREMIUM Screen 21 — TEI 7 Day Planner |

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

## Client decisions applied

These were ambiguities in the source documents, resolved by the client and
implemented:

| Question | Decision |
| -------- | -------- |
| Cardio of 0 | Valid — means "no cardio", contributes 0. A non-zero entry must be at least 7 minutes. |
| Cardio entered first | Zero-fills the strength variables, so a Cardio ONLY session can be logged on the Standard calculator. |
| TEI 3-33 | An expected band, not a cap. The red gradient still warns above 22; above 33 prompts that the data may be misdefined, since that is not a survivable workload. |
| Re-planning a day | Overwrites the previous plan. No plan history. |
| Sessions per day | Multiple allowed, each with its own timestamp and calculator; Review sums them for the day. |
| Deck typos | Corrected ("Training Sets", "Strength Training", "Formats", "Review", "Change Last Name", "Circuit"). |
| Session date picker | Not needed for the prototype; required for v1.0. |
| Light mode + 11 accent colours | Phase 2, a defining Premium feature in v1.0. |
| Week start | Sunday-Saturday. A user setting in v1.0. |
| Effective Ranges | Elemental: informational, "make a note". Basic and above: tapping a timeframe sets the denominator of "% of Target". |

## Prototype limitations

Deliberate, and matching the agreed scope:

- **Elemental saves no history.** That is the tier's design, not a gap: the
  calculator computes a score but does not write to `sessions`. Basic and
  Premium accounts do save, and the Review calendar reads them back.
- **No payments.** The Basic/Premium payment pop-ups (Screens 9 and 11) are not
  built. Instead, tiers switch **instantly and free of charge** from the
  Upgrade screen so all three can be demoed — tap *Upgrade* on Home or Profile
  and pick a plan. This is backed by the `set_my_tier` RPC in
  `supabase/migrations/0003_prototype_tier_switch.sql`, which **must be dropped
  before launch**: leaving it in production would let anyone grant themselves
  Premium for free. Real tier changes should come from a payment webhook using
  the service_role key.
- **Email is read-only on the Profile screen.** Changing it needs a
  confirmation round-trip that is not wired up.
- **No password reset.** The "Forgot password?" link shows a notice.
- **Planning has no date picker.** The 7-day planner takes its start date from
  the calendar you tapped; changing it in place is not wired up.
- **The pop-up planner variants** (PREMIUM Screens 23-27) are not separate
  screens: tapping a day routes to the normal calculator with a `?plan=` day,
  which saves a target instead of a logged session. Same maths, one screen.
- **TEI Premium Review by timeframe** (Screens 17-19) is not built; the Basic
  monthly Review is.

## Source documents

- `../Mission Simple TEI App with 5 Calculators Outline-PRD Resource (1).pptx`
- `../Standard Strength Training Calculator - Formula Cheat Sheet.pdf`
- `../Total Effect Index TEI - 5 Calculators.xlsx`
- `../total-effect-index-tei-mobile-app-prototype-prd.pdf`
