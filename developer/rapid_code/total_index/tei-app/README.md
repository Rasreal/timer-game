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

- **No persistence.** State lives in React context (`src/store.tsx`) and resets
  on reload — the Elemental tier saves no data by design.
- **No backend.** Log in accepts any email plus an 8+ character password;
  account creation validates format only.
- **No payments.** The Basic/Premium payment pop-ups (Screens 9 and 11) are
  out of scope since only the free tier is built.
- **Session date is fixed** to April 27, 2026 – 2:33pm to match the mock-ups.
- **Premium-only UI** (progress gradients on rings, the 5 calculator formats,
  Review calendar, Plan/Workload designer) is not built.

## Source documents

- `../Mission Simple TEI App with 5 Calculators Outline-PRD Resource (1).pptx`
- `../Standard Strength Training Calculator - Formula Cheat Sheet.pdf`
- `../Total Effect Index TEI - 5 Calculators.xlsx`
- `../total-effect-index-tei-mobile-app-prototype-prd.pdf`
