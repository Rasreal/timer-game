import type { ReactElement } from 'react';
import { act, render, type RenderResult } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider, useStore, type SessionDraft } from '../../src/store';

/** Deterministic insets so `useSafeAreaInsets()` resolves without a device. */
const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/**
 * Shared harness for the calculator screens.
 *
 * The screens read their variable values from `StoreProvider`, so tests need a
 * way to write into the draft from the outside. `renderCalc` mounts a small
 * probe alongside the screen that captures the live store, then applies any
 * `seed` inside `act()` before handing back the render result — so assertions
 * run against a settled store rather than a first-paint empty one.
 *
 * `../../src/auth` and `../../src/lib/supabase` are expected to be
 * jest.mock()'d by the individual test file so nothing touches the network.
 */

export type SessionSeed = Partial<Omit<SessionDraft, 'date'>>;

export interface StoreHandle {
  /** Write one variable into the session draft. */
  set: (field: keyof SessionSeed, value: number | null) => void;
  /** Write several variables at once. */
  seed: (values: SessionSeed) => void;
  /** The live session draft as of the last render. */
  current: () => SessionDraft;
  /** The most recent toast message, or null. */
  toast: () => string | null;
}

function Probe({ onReady }: { onReady: (s: ReturnType<typeof useStore>) => void }) {
  const store = useStore();
  onReady(store);
  return null;
}

export interface RenderCalcResult extends RenderResult {
  store: StoreHandle;
}

export function renderCalc(
  ui: ReactElement,
  options: { seed?: SessionSeed; seedBeforeMount?: boolean } = {},
): RenderCalcResult {
  let live: ReturnType<typeof useStore> | null = null;
  const capture = (s: ReturnType<typeof useStore>) => {
    live = s;
  };

  // Screens whose `useState` initialiser reads the store (the guided entry
  // screen does) must not see an empty draft on their first render, so the
  // seed is applied to a store-only tree and the screen is mounted after.
  const deferred = Boolean(options.seed && options.seedBeforeMount);

  const tree = (children: ReactElement | null) => (
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <StoreProvider>
        <Probe onReady={capture} />
        {children}
      </StoreProvider>
    </SafeAreaProvider>
  );

  const result = render(tree(deferred ? null : ui));

  const store: StoreHandle = {
    set: (field, value) =>
      act(() => {
        live!.setSessionField(field, value);
      }),
    seed: (values) =>
      act(() => {
        for (const [k, v] of Object.entries(values)) {
          live!.setSessionField(k as keyof SessionSeed, v as number | null);
        }
      }),
    current: () => live!.session,
    toast: () => live!.toast,
  };

  if (options.seed) store.seed(options.seed);
  if (deferred) act(() => result.rerender(tree(ui)));

  return Object.assign(result, { store });
}

/** A profile object shaped like `ProfileRow`, for the useAuth mock. */
export function makeProfile(
  tier: 'elemental' | 'basic' | 'premium' = 'premium',
  overrides: Record<string, unknown> = {},
) {
  return {
    id: 'user-1',
    first_name: 'Ada',
    last_name: 'Lovelace',
    tier,
    created_at: '2026-04-27T14:33:00.000Z',
    ...overrides,
  };
}

/** The default `useAuth()` return value used by these tests. */
export function makeAuth(
  tier: 'elemental' | 'basic' | 'premium' | null = 'premium',
) {
  return {
    session: null,
    profile: tier === null ? null : makeProfile(tier),
    profileError: null,
    reloadProfile: jest.fn(),
    changeTier: jest.fn(),
    initializing: false,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    updateProfile: jest.fn(),
  };
}
