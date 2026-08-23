import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import type { Database, ProfileRow, TeiTier } from './lib/database.types';

type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

interface SignUpArgs {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  tier: TeiTier;
}

interface AuthState {
  /** Undefined until the stored session has been restored. */
  session: Session | null;
  profile: ProfileRow | null;
  /** Set when the profile could not be fetched, so the UI can say so. */
  profileError: string | null;
  /** Re-attempt a failed profile load. */
  reloadProfile: () => void;
  /**
   * PROTOTYPE ONLY: switch subscription tier with no payment, so all three
   * tiers can be demoed. Backed by the `set_my_tier` RPC — see
   * supabase/migrations/0003, which must be removed once billing exists.
   */
  changeTier: (tier: TeiTier) => Promise<string | null>;
  /** True while the initial session restore is in flight. */
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (args: SignUpArgs) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
  /** Resolves to the failure message, or null on success — as signIn does. */
  signOut: () => Promise<string | null>;
  updateProfile: (patch: {
    firstName?: string;
    lastName?: string;
    password?: string;
  }) => Promise<string | null>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  /**
   * Fetch the user's profile, retrying briefly if it is not there yet.
   *
   * On sign-up the row is created by the `handle_new_user` trigger on
   * `auth.users`. The client can win the race and query before that row is
   * visible, which previously left the Home screen with a blank name until
   * the app was restarted. Retrying also covers a transient network failure
   * on mobile cold-start.
   */
  const loadProfile = useCallback(async (userId: string) => {
    const DELAYS_MS = [0, 250, 600, 1200];

    for (const wait of DELAYS_MS) {
      if (wait) await new Promise((r) => setTimeout(r, wait));

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        setProfileError(error.message);
        continue;
      }
      if (data) {
        setProfile(data);
        setProfileError(null);
        return;
      }
    }

    // Out of retries: surface it rather than looking like a blank profile.
    setProfileError('Could not load your profile. Pull to retry or sign in again.');
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) void loadProfile(data.session.user.id);
      setInitializing(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      setSession(next);
      if (next) {
        void loadProfile(next.user.id);
      } else {
        setProfile(null);
        setProfileError(null);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback<AuthState['signIn']>(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return error ? error.message : null;
  }, []);

  const signUp = useCallback<AuthState['signUp']>(
    async ({ firstName, lastName, email, password, tier }) => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          // Read by the handle_new_user() trigger to populate public.profiles.
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            tier,
          },
        },
      });

      const DUPLICATE =
        'An account with that email already exists. Try logging in.';

      if (error) {
        // With email confirmation OFF, a duplicate signup errors outright.
        return {
          error: /already registered/i.test(error.message)
            ? DUPLICATE
            : error.message,
          needsEmailConfirmation: false,
        };
      }

      // With email confirmation ON, Supabase instead stays silent about
      // duplicates (erroring would leak which addresses are registered) and
      // returns a decoy user with an empty `identities` array. Both shapes are
      // handled so this keeps working whichever way the project is configured.
      if (data.user && data.user.identities?.length === 0) {
        return { error: DUPLICATE, needsEmailConfirmation: false };
      }

      // With email confirmation enabled, signUp succeeds but returns no
      // session — the user must click the emailed link before they can log in.
      return {
        error: null,
        needsEmailConfirmation: data.session === null,
      };
    },
    [],
  );

  const signOut = useCallback<AuthState['signOut']>(async () => {
    const { error } = await supabase.auth.signOut();
    return error ? error.message : null;
  }, []);

  const updateProfile = useCallback<AuthState['updateProfile']>(
    async ({ firstName, lastName, password }) => {
      if (!session) return 'Not signed in.';

      // Save the name FIRST. Doing the password first meant that a rejected
      // password (e.g. Supabase refusing a reuse of the current one) returned
      // early and silently discarded the user's name edit.
      if (firstName !== undefined || lastName !== undefined) {
        const patch: ProfileUpdate = {};
        if (firstName !== undefined) patch.first_name = firstName.trim();
        if (lastName !== undefined) patch.last_name = lastName.trim();

        const { data, error } = await supabase
          .from('profiles')
          .update(patch)
          .eq('id', session.user.id)
          .select()
          .single();

        if (error) return error.message;
        setProfile(data);
      }

      if (password) {
        const { error } = await supabase.auth.updateUser({ password });
        // The name change above already succeeded, so say so explicitly
        // rather than letting the user assume nothing was saved.
        if (error) return `Your name was saved, but the password was not: ${error.message}`;
      }

      return null;
    },
    [session],
  );

  const reloadProfile = useCallback(() => {
    if (session) void loadProfile(session.user.id);
  }, [session, loadProfile]);

  const changeTier = useCallback<AuthState['changeTier']>(
    async (tier) => {
      if (!session) return 'Not signed in.';

      const { data, error } = await supabase.rpc('set_my_tier', {
        new_tier: tier,
      });

      if (error) return error.message;
      if (data) setProfile(data as ProfileRow);
      return null;
    },
    [session],
  );

  const value = useMemo(
    () => ({
      session,
      profile,
      profileError,
      reloadProfile,
      changeTier,
      initializing,
      signIn,
      signUp,
      signOut,
      updateProfile,
    }),
    [
      session,
      profile,
      profileError,
      reloadProfile,
      changeTier,
      initializing,
      signIn,
      signUp,
      signOut,
      updateProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
