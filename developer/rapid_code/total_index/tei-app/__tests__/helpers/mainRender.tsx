import type { ReactElement, ReactNode } from 'react';
import { render, type RenderResult } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider, useStore } from '../../src/store';
import type { ProfileRow, SessionRow, TeiTier } from '../../src/lib/database.types';
import type { PlanRow } from '../../src/lib/plans';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/**
 * Screens only call `showToast()`; the toast itself is painted by
 * `GlobalToast` in app/_layout.tsx. This mirror renders the store's current
 * toast so tests can assert on the message the screen asked for.
 */
function ToastMirror() {
  const { toast } = useStore();
  if (!toast) return null;
  return <Text testID="toast">{toast}</Text>;
}

export function MainProviders({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={METRICS}>
      <StoreProvider>
        {children}
        <ToastMirror />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

/**
 * Wrapper for the main-app screens. `../../src/auth` is jest.mock()'d by each
 * test file so `useAuth` hands back a controllable value; this supplies the
 * real StoreProvider plus safe-area metrics.
 */
export function renderMain(ui: ReactElement): RenderResult {
  return render(<MainProviders>{ui}</MainProviders>);
}

/* --------------------------------------------------------------------- */
/* Fixtures                                                              */
/* --------------------------------------------------------------------- */

export function makeProfile(over: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: 'user-1',
    first_name: 'Ada',
    last_name: 'Lovelace',
    email: 'ada@example.com',
    tier: 'elemental' as TeiTier,
    accent_color: '#FF8A25',
    theme: 'dark' as const,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

export function makeSession(over: Partial<SessionRow> = {}): SessionRow {
  return {
    id: 'session-1',
    user_id: 'user-1',
    performed_at: new Date().toISOString(),
    sets: 10,
    rest_seconds: 60,
    exertion_percent: 80,
    cardio_minutes: 20,
    breakdowns: null,
    exercises: null,
    circuits: null,
    yoga_minutes: null,
    tei: 12,
    calculator: 'standard',
    created_at: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

export function makePlan(over: Partial<PlanRow> = {}): PlanRow {
  return {
    id: 'plan-1',
    user_id: 'user-1',
    planned_for: '2026-08-23',
    tei: 14,
    calculator: 'standard',
    sets: 12,
    rest_seconds: 90,
    exertion_percent: 75,
    cardio_minutes: 25,
    breakdowns: null,
    exercises: null,
    circuits: null,
    yoga_minutes: null,
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
    ...over,
  };
}

/** Local YYYY-MM-DD, matching src/lib/plans.planDayKey. */
export function dayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** A default `useAuth()` value: signed in, with the given tier. */
export function makeAuth(over: Record<string, unknown> = {}) {
  return {
    session: { user: { id: 'user-1' } },
    profile: makeProfile(),
    profileError: null,
    reloadProfile: jest.fn(),
    changeTier: jest.fn(async () => null),
    initializing: false,
    signIn: jest.fn(async () => null),
    signUp: jest.fn(async () => ({ error: null, needsEmailConfirmation: false })),
    signOut: jest.fn(async () => undefined),
    updateProfile: jest.fn(async () => null),
    ...over,
  };
}
