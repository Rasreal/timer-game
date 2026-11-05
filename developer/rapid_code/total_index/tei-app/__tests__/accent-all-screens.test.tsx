import type { ReactElement } from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '../src/auth';
import * as sessions from '../src/lib/sessions';
import * as plans from '../src/lib/plans';
import {
  DEFAULT_ACCENT,
  accentAlpha,
  lightTint,
  onAccentTint,
  setAccent,
} from '../src/theme';
import { makeAuth, makeProfile, makeSession, renderMain } from './helpers/mainRender';

import AccountType from '../app/account-type';
import AthleteQuiz from '../app/athlete-quiz';
import Breakdown from '../app/calc/breakdown';
import Cardio from '../app/calc/cardio';
import Circuit from '../app/calc/circuit';
import Yoga from '../app/calc/yoga';
import Calculator from '../app/calculator';
import CreateAccount from '../app/create-account';
import Entry from '../app/entry/[variable]';
import ForgotPassword from '../app/forgot-password';
import Home from '../app/home';
import Index from '../app/index';
import Info from '../app/info/[topic]';
import Login from '../app/login';
import Plan from '../app/plan';
import Planner from '../app/planner';
import Profile from '../app/profile';
import Ranges from '../app/ranges';
import ResetPassword from '../app/reset-password';
import Review from '../app/review';
import ReviewSnapshot from '../app/review-snapshot';
import ReviewTimeframe from '../app/review-timeframe';
import ReviewWeek from '../app/review-week';
import SessionType from '../app/session-type';
import Subscribe from '../app/subscribe';
import TrainingScaleScreen from '../app/training-scale';

jest.mock('../src/lib/supabase');
jest.mock('../src/lib/sessions');
jest.mock('../src/lib/plans', () => ({
  ...jest.requireActual('../src/lib/plans'),
  listPlansBetween: jest.fn(),
  savePlan: jest.fn(),
  clearPlan: jest.fn(),
}));
jest.mock('../src/lib/billing', () => ({
  ...jest.requireActual('../src/lib/billing'),
  getSubscription: jest.fn(() => Promise.resolve({ data: null, error: null })),
}));
jest.mock('../src/auth');
jest.mock('expo-linking', () => ({
  ...jest.requireActual('expo-linking'),
  createURL: jest.fn(() => 'tei://subscribe'),
}));
jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View };
});

const mockedAuth = useAuth as jest.MockedFunction<typeof useAuth>;

/** A Premium swatch that is unmistakably not the brand orange. */
const PURPLE = '#7E28BD';

/**
 * Every shade the brand orange shows up as: itself, the white-screen tint, the
 * on-accent tint and the press wash. Under any other accent none may remain.
 */
const ORANGE_SHADES = [
  DEFAULT_ACCENT,
  lightTint(DEFAULT_ACCENT),
  onAccentTint(DEFAULT_ACCENT),
].map((c) => c.toUpperCase());
const ORANGE_WASH = accentAlpha(DEFAULT_ACCENT, 0.16).replace(/[\d.]+\)$/, '');

/** Every colour string in the tree: style values, colour props, gradient stops. */
function allColours(): string[] {
  const out: string[] = [];
  const seen = new Set<unknown>();
  const take = (v: unknown) => {
    if (typeof v === 'string' && (v.startsWith('#') || v.startsWith('rgb'))) {
      out.push(v.toUpperCase());
    } else if (v && typeof v === 'object' && !seen.has(v)) {
      seen.add(v);
      Object.values(v).forEach(take);
    }
  };
  const visit = (node: unknown): void => {
    if (!node) return;
    if (Array.isArray(node)) return node.forEach(visit);
    if (typeof node !== 'object') return;
    const n = node as { props?: Record<string, unknown>; children?: unknown[] };
    // Edit Profile's colour picker shows every swatch, orange included.
    if (n.props?.accessibilityRole === 'radio') return;
    // Styles plus colour props (color, colors, tintColor, selectionColor…).
    for (const [key, value] of Object.entries(n.props ?? {})) {
      if (key === 'style' || /colou?rs?$/i.test(key)) take(value);
    }
    for (const child of n.children ?? []) visit(child);
  };
  visit(screen.toJSON());
  return out;
}

function expectNoOrange() {
  const colours = allColours();
  const stray = colours.filter(
    (c) => ORANGE_SHADES.includes(c) || c.startsWith(ORANGE_WASH.toUpperCase()),
  );
  expect(stray).toEqual([]);
}

const SESSIONS = [
  makeSession({ id: 'a', performed_at: new Date(2026, 4, 5, 7).toISOString(), tei: 16 }),
  makeSession({ id: 'b', performed_at: new Date(2026, 4, 5, 18).toISOString(), tei: 4 }),
];

beforeEach(() => {
  setAccent(DEFAULT_ACCENT);
  mockedAuth.mockReturnValue(
    makeAuth({ profile: makeProfile({ tier: 'premium', accent_color: PURPLE }) }) as never,
  );
  (sessions.latestSession as jest.Mock).mockResolvedValue({
    data: makeSession({ tei: 27 }),
    error: null,
  });
  (sessions.listSessionsBetween as jest.Mock).mockResolvedValue({ data: SESSIONS, error: null });
  (plans.listPlansBetween as jest.Mock).mockResolvedValue({ data: [], error: null });
  (useLocalSearchParams as jest.Mock).mockReturnValue({});
});

afterEach(() => {
  // Module-level state; purple must not bleed into later suites.
  setAccent(DEFAULT_ACCENT);
});

const SCREENS: [string, () => ReactElement, Record<string, string>?][] = [
  ['What is TEI (index)', () => <Index />],
  ['Login', () => <Login />],
  ['Create Account', () => <CreateAccount />],
  ['Forgot Password', () => <ForgotPassword />],
  ['Reset Password', () => <ResetPassword />],
  ['Account Type', () => <AccountType />],
  ['Subscribe', () => <Subscribe />],
  ['Home', () => <Home />],
  ['Profile', () => <Profile />],
  ['Calculator', () => <Calculator />],
  ['Session Type', () => <SessionType />],
  ['Breakdown calculator', () => <Breakdown />],
  ['Cardio calculator', () => <Cardio />],
  ['Circuit calculator', () => <Circuit />],
  ['Yoga calculator', () => <Yoga />],
  ['Entry guidance', () => <Entry />, { variable: 'sets' }],
  ['Effective Ranges', () => <Ranges />],
  ['Review month', () => <Review />],
  ['7 Days in Review', () => <ReviewWeek />, { start: '2026-05-04' }],
  ['Snapshot', () => <ReviewSnapshot />],
  ['Review timeframes', () => <ReviewTimeframe />],
  ['Understanding YOUR Training', () => <TrainingScaleScreen />],
  ['Help page', () => <Info />, { topic: 'upgrade' }],
  ['Athlete quiz', () => <AthleteQuiz />],
  ['Plan month', () => <Plan />],
  ['7-Day Planner', () => <Planner />],
];

describe('every screen follows the chosen accent', () => {
  it.each(SCREENS)('%s, opened after the colour was picked', async (_name, ui, params = {}) => {
    // A default keeps the arity at 2, so Jest doesn't read params as `done`.
    (useLocalSearchParams as jest.Mock).mockReturnValue(params);
    setAccent(PURPLE, 'premium');
    renderMain(ui());
    await act(async () => {});

    expectNoOrange();
  });

  it.each(SCREENS)('%s, already open when the colour changes', async (_name, ui, params = {}) => {
    // A default keeps the arity at 2, so Jest doesn't read params as `done`.
    (useLocalSearchParams as jest.Mock).mockReturnValue(params);
    renderMain(ui());
    await act(async () => {});
    act(() => setAccent(PURPLE, 'premium'));

    expectNoOrange();
  });
});

describe('pop-ups follow the chosen accent', () => {
  it("Home's ••• options sheet", async () => {
    setAccent(PURPLE, 'premium');
    renderMain(<Home />);
    await act(async () => {});
    fireEvent.press(screen.getByLabelText('Review options'));

    expectNoOrange();
  });

  it('the Multiple Entries sheet', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ start: '2026-05-04' });
    setAccent(PURPLE, 'premium');
    renderMain(<ReviewWeek />);
    await act(async () => {});
    fireEvent.press(screen.getByText('Multiple Entries →'));

    expectNoOrange();
  });

  it('The 3 TEI and the Premium waitlist', async () => {
    // Premium keeps its plan, so the waitlist is offered to Basic.
    mockedAuth.mockReturnValue(
      makeAuth({ profile: makeProfile({ tier: 'basic' }) }) as never,
    );
    setAccent(PURPLE, 'premium');
    renderMain(<AccountType />);
    await act(async () => {});
    fireEvent.press(screen.getByLabelText('More about Helpful'));
    expectNoOrange();

    fireEvent.press(screen.getByLabelText('Join the TEI Premium waitlist'));
    expectNoOrange();
  });
});
