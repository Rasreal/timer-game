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
  /** True while the initial session restore is in flight. */
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (args: SignUpArgs) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
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
  const [initializing, setInitializing] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Failed to load profile:', error.message);
      return;
    }
    setProfile(data ?? null);
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

      if (error) {
        return { error: error.message, needsEmailConfirmation: false };
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

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const updateProfile = useCallback<AuthState['updateProfile']>(
    async ({ firstName, lastName, password }) => {
      if (!session) return 'Not signed in.';

      if (password) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) return error.message;
      }

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

      return null;
    },
    [session],
  );

  const value = useMemo(
    () => ({
      session,
      profile,
      initializing,
      signIn,
      signUp,
      signOut,
      updateProfile,
    }),
    [session, profile, initializing, signIn, signUp, signOut, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
