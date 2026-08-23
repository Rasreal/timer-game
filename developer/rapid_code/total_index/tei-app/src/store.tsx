import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { TeiTier } from './lib/database.types';

export type Tier = TeiTier;

export interface SessionDraft {
  sets: number | null;
  restSeconds: number | null;
  exertionPercent: number | null;
  cardioMinutes: number | null;
  // Premium-only variables. Each calculator reads only the ones it needs, so
  // these stay null for the Standard model.
  breakdowns: number | null;
  exercises: number | null;
  circuits: number | null;
  yogaMinutes: number | null;
  /** ISO timestamp for the session being logged. */
  date: string;
}

/**
 * UI state that is not the signed-in user.
 *
 * The authenticated user and their profile live in `AuthProvider` (src/auth.tsx),
 * backed by Supabase. This store holds only the in-progress calculator draft
 * and the transient toast.
 */
interface Store {
  /** Tier chosen on the Account Type screen, before the account exists. */
  pendingTier: Tier;
  setPendingTier: (t: Tier) => void;
  /**
   * The Effective Ranges timeframe the user tapped (WEEKLY, MONTHLY, ...).
   * On Basic and above this is what the calculators' "% of Target" bar
   * measures against; on Elemental the screen is informational only.
   */
  targetRange: string | null;
  setTargetRange: (label: string | null) => void;
  session: SessionDraft;
  setSessionField: (
    field: keyof Omit<SessionDraft, 'date'>,
    value: number | null,
  ) => void;
  setSessionDate: (iso: string) => void;
  resetSession: () => void;
  toast: string | null;
  showToast: (message: string) => void;
}

function emptySession(): SessionDraft {
  return {
    sets: null,
    restSeconds: null,
    exertionPercent: null,
    cardioMinutes: null,
    breakdowns: null,
    exercises: null,
    circuits: null,
    yogaMinutes: null,
    // A new session defaults to now; the user can change it on the calculator.
    date: new Date().toISOString(),
  };
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [pendingTier, setPendingTier] = useState<Tier>('elemental');
  const [targetRange, setTargetRange] = useState<string | null>(null);
  const [session, setSession] = useState<SessionDraft>(emptySession);
  const [toast, setToast] = useState<string | null>(null);

  const setSessionField = useCallback(
    (field: keyof Omit<SessionDraft, 'date'>, value: number | null) => {
      setSession((s) => ({ ...s, [field]: value }));
    },
    [],
  );

  const setSessionDate = useCallback((iso: string) => {
    setSession((s) => ({ ...s, date: iso }));
  }, []);

  const resetSession = useCallback(() => setSession(emptySession()), []);

  // Only the newest toast is shown, so the previous one's timer has to go
  // with it — otherwise it fires mid-life of its replacement and blanks it
  // early.
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => {
      toastTimer.current = null;
      setToast(null);
    }, 2600);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const value = useMemo(
    () => ({
      pendingTier,
      setPendingTier,
      targetRange,
      setTargetRange,
      session,
      setSessionField,
      setSessionDate,
      resetSession,
      toast,
      showToast,
    }),
    [
      pendingTier,
      targetRange,
      session,
      setSessionField,
      setSessionDate,
      resetSession,
      toast,
      showToast,
    ],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

export function formatSessionDate(iso: string): string {
  const d = new Date(iso);
  const month = d.toLocaleString('en-US', { month: 'long' });
  const hours = d.getHours();
  const mins = d.getMinutes().toString().padStart(2, '0');
  const suffix = hours >= 12 ? 'pm' : 'am';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${month} ${d.getDate()}, ${d.getFullYear()} - ${h12}:${mins}${suffix}`;
}
