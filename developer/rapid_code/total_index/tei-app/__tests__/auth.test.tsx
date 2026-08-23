/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';

/* ------------------------------------------------------------------ mocks */

interface Result {
  data: unknown;
  error: { message: string } | null;
}

const profileResult: { value: Result } = {
  value: { data: null, error: null },
};

const profileQueue: Result[] = [];

const selectCalls: unknown[][] = [];
const eqCalls: unknown[][] = [];
const updateCalls: unknown[][] = [];
const mockFromCalls: unknown[][] = [];

const nextProfileResult = (): Result =>
  profileQueue.length ? (profileQueue.shift() as Result) : profileResult.value;

const mockBuilder: Record<string, unknown> = {};
mockBuilder.select = jest.fn((...a: unknown[]) => {
  selectCalls.push(a);
  return mockBuilder;
});
mockBuilder.update = jest.fn((...a: unknown[]) => {
  updateCalls.push(a);
  return mockBuilder;
});
mockBuilder.eq = jest.fn((...a: unknown[]) => {
  eqCalls.push(a);
  return mockBuilder;
});
mockBuilder.maybeSingle = jest.fn(async () => nextProfileResult());
mockBuilder.single = jest.fn(async () => nextProfileResult());

/** Loosely typed so each test can hand back whatever shape it needs. */
type AnyMock = jest.Mock<any, any[]>;

const unsubscribeMock = jest.fn();

const mockAuth: {
  getSession: AnyMock;
  onAuthStateChange: AnyMock;
  signInWithPassword: AnyMock;
  signUp: AnyMock;
  signOut: AnyMock;
  updateUser: AnyMock;
} = {
  getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
  onAuthStateChange: jest.fn(() => ({
    data: { subscription: { unsubscribe: unsubscribeMock } },
  })),
  signInWithPassword: jest.fn(async () => ({ data: {}, error: null })),
  signUp: jest.fn(async () => ({
    data: { user: { id: 'u1', identities: [{ id: 'i1' }] }, session: {} },
    error: null,
  })),
  signOut: jest.fn(async () => ({ error: null })),
  updateUser: jest.fn(async () => ({ data: {}, error: null })),
};

const mockRpc: AnyMock = jest.fn(async () => ({ data: null, error: null }));

jest.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...a: unknown[]) =>
        (mockAuth.getSession as unknown as (...x: unknown[]) => unknown)(...a),
      onAuthStateChange: (...a: unknown[]) =>
        (mockAuth.onAuthStateChange as unknown as (...x: unknown[]) => unknown)(
          ...a,
        ),
      signInWithPassword: (...a: unknown[]) =>
        (
          mockAuth.signInWithPassword as unknown as (...x: unknown[]) => unknown
        )(...a),
      signUp: (...a: unknown[]) =>
        (mockAuth.signUp as unknown as (...x: unknown[]) => unknown)(...a),
      signOut: (...a: unknown[]) =>
        (mockAuth.signOut as unknown as (...x: unknown[]) => unknown)(...a),
      updateUser: (...a: unknown[]) =>
        (mockAuth.updateUser as unknown as (...x: unknown[]) => unknown)(...a),
    },
    from: (...a: unknown[]) => {
      mockFromCalls.push(a);
      return mockBuilder;
    },
    rpc: (...a: unknown[]) =>
      (mockRpc as unknown as (...x: unknown[]) => unknown)(...a),
  },
}));

import { AuthProvider, useAuth } from '../src/auth';

/* --------------------------------------------------------------- fixtures */

const PROFILE = {
  id: 'user-1',
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  tier: 'basic' as const,
  accent_color: '#00ff00',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const SESSION = {
  access_token: 'tok',
  refresh_token: 'ref',
  expires_in: 3600,
  token_type: 'bearer',
  user: { id: 'user-1', email: 'ada@example.com' },
} as never;

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

const renderAuth = () => renderHook(() => useAuth(), { wrapper });

/** Grab the listener AuthProvider registered with onAuthStateChange. */
const emitAuthChange = async (event: string, next: unknown) => {
  const calls = mockAuth.onAuthStateChange.mock.calls;
  const listener = calls[calls.length - 1][0] as (
    e: string,
    s: unknown,
  ) => void;
  await act(async () => {
    listener(event, next);
  });
};

beforeEach(() => {
  profileQueue.length = 0;
  profileResult.value = { data: PROFILE, error: null };
  selectCalls.length = 0;
  eqCalls.length = 0;
  updateCalls.length = 0;
  mockFromCalls.length = 0;
  unsubscribeMock.mockClear();

  mockAuth.getSession.mockImplementation(async () => ({
    data: { session: null },
    error: null,
  }));
  mockAuth.onAuthStateChange.mockImplementation(() => ({
    data: { subscription: { unsubscribe: unsubscribeMock } },
  }));
  mockAuth.signInWithPassword.mockImplementation(async () => ({
    data: {},
    error: null,
  }));
  mockAuth.signUp.mockImplementation(async () => ({
    data: { user: { id: 'u1', identities: [{ id: 'i1' }] }, session: {} },
    error: null,
  }));
  mockAuth.signOut.mockImplementation(async () => ({ error: null }));
  mockAuth.updateUser.mockImplementation(async () => ({
    data: {},
    error: null,
  }));
  mockRpc.mockImplementation(async () => ({ data: null, error: null }));
});

/* ------------------------------------------------------------------ tests */

describe('useAuth outside a provider', () => {
  it('throws a helpful error', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used inside <AuthProvider>',
    );
  });
});

describe('initialisation', () => {
  it('starts with initializing true and no session or profile', () => {
    let resolve!: (v: unknown) => void;
    mockAuth.getSession.mockImplementation(
      () => new Promise((r) => (resolve = r as (v: unknown) => void)) as never,
    );

    const { result } = renderAuth();

    expect(result.current.initializing).toBe(true);
    expect(result.current.session).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.profileError).toBeNull();

    act(() => resolve({ data: { session: null } }));
  });

  it('clears initializing once the restore resolves with no session', async () => {
    const { result } = renderAuth();

    await waitFor(() => expect(result.current.initializing).toBe(false));
    expect(result.current.session).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(mockAuth.getSession).toHaveBeenCalledTimes(1);
  });

  it('registers exactly one onAuthStateChange listener', async () => {
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.initializing).toBe(false));
    expect(mockAuth.onAuthStateChange).toHaveBeenCalledTimes(1);
  });

  it('populates session and profile from a restored session', async () => {
    mockAuth.getSession.mockImplementation(async () => ({
      data: { session: SESSION },
      error: null,
    }));

    const { result } = renderAuth();

    await waitFor(() => expect(result.current.profile).toEqual(PROFILE));
    expect(result.current.session).toBe(SESSION);
    expect(result.current.initializing).toBe(false);
    expect(result.current.profileError).toBeNull();
  });

  it('queries the profiles table by id', async () => {
    mockAuth.getSession.mockImplementation(async () => ({
      data: { session: SESSION },
      error: null,
    }));

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.profile).toEqual(PROFILE));

    expect(mockFromCalls[0]).toEqual(['profiles']);
    expect(selectCalls[0]).toEqual(['*']);
    expect(eqCalls[0]).toEqual(['id', 'user-1']);
    expect(mockBuilder.maybeSingle).toHaveBeenCalled();
  });

  it('does not fetch a profile when there is no session', async () => {
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.initializing).toBe(false));
    expect(mockFromCalls.length).toBe(0);
  });

  it('unsubscribes the auth listener on unmount', async () => {
    const { result, unmount } = renderAuth();
    await waitFor(() => expect(result.current.initializing).toBe(false));

    expect(unsubscribeMock).not.toHaveBeenCalled();
    unmount();
    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });

  it('ignores a late getSession resolution after unmount', async () => {
    let resolve!: (v: unknown) => void;
    mockAuth.getSession.mockImplementation(
      () => new Promise((r) => (resolve = r as (v: unknown) => void)) as never,
    );

    const { unmount } = renderAuth();
    unmount();

    await act(async () => {
      resolve({ data: { session: SESSION } });
    });

    // No profile fetch was started because `active` was already false.
    expect(mockFromCalls.length).toBe(0);
  });
});

describe('profile loading', () => {
  it('retries and succeeds when the row appears on a later attempt', async () => {
    jest.useFakeTimers();
    mockAuth.getSession.mockImplementation(async () => ({
      data: { session: SESSION },
      error: null,
    }));
    profileQueue.push(
      { data: null, error: null },
      { data: PROFILE, error: null },
    );

    const { result } = renderAuth();

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(250);
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.profile).toEqual(PROFILE), {
      timeout: 5000,
    });
    jest.useRealTimers();
  });

  it('sets a fallback profileError after exhausting all four attempts', async () => {
    jest.useFakeTimers();
    mockAuth.getSession.mockImplementation(async () => ({
      data: { session: SESSION },
      error: null,
    }));
    profileResult.value = { data: null, error: null };

    const { result } = renderAuth();

    await act(async () => {
      for (let i = 0; i < 12; i++) {
        jest.advanceTimersByTime(1200);
        await Promise.resolve();
      }
    });

    expect(result.current.profile).toBeNull();
    expect(result.current.profileError).toBe(
      'Could not load your profile. Pull to retry or sign in again.',
    );
    // 4 attempts => 4 queries.
    expect(mockFromCalls.length).toBe(4);
    jest.useRealTimers();
  });

  it('propagates a query error message into profileError', async () => {
    jest.useFakeTimers();
    mockAuth.getSession.mockImplementation(async () => ({
      data: { session: SESSION },
      error: null,
    }));
    profileQueue.push({ data: null, error: { message: 'RLS denied' } });
    profileResult.value = { data: PROFILE, error: null };

    const { result } = renderAuth();

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(250);
      await Promise.resolve();
      await Promise.resolve();
    });

    // The retry succeeded, so the transient error is cleared again.
    await waitFor(() => expect(result.current.profile).toEqual(PROFILE));
    expect(result.current.profileError).toBeNull();
    jest.useRealTimers();
  });

  it('reloadProfile re-queries when signed in', async () => {
    mockAuth.getSession.mockImplementation(async () => ({
      data: { session: SESSION },
      error: null,
    }));

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.profile).toEqual(PROFILE));

    const before = mockFromCalls.length;
    await act(async () => {
      result.current.reloadProfile();
    });
    expect(mockFromCalls.length).toBe(before + 1);
  });

  it('reloadProfile is a no-op when signed out', async () => {
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.initializing).toBe(false));

    await act(async () => {
      result.current.reloadProfile();
    });
    expect(mockFromCalls.length).toBe(0);
  });
});

describe('auth state changes', () => {
  it('populates session and profile on SIGNED_IN', async () => {
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.initializing).toBe(false));

    await emitAuthChange('SIGNED_IN', SESSION);

    await waitFor(() => expect(result.current.profile).toEqual(PROFILE));
    expect(result.current.session).toBe(SESSION);
  });

  it('clears session, profile and profileError on SIGNED_OUT', async () => {
    mockAuth.getSession.mockImplementation(async () => ({
      data: { session: SESSION },
      error: null,
    }));

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.profile).toEqual(PROFILE));

    await emitAuthChange('SIGNED_OUT', null);

    expect(result.current.session).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.profileError).toBeNull();
  });

  it('does not fetch a profile on sign-out', async () => {
    mockAuth.getSession.mockImplementation(async () => ({
      data: { session: SESSION },
      error: null,
    }));

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.profile).toEqual(PROFILE));

    const before = mockFromCalls.length;
    await emitAuthChange('SIGNED_OUT', null);
    expect(mockFromCalls.length).toBe(before);
  });
});

describe('signIn', () => {
  it('trims the email and returns null on success', async () => {
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.initializing).toBe(false));

    let out: string | null = 'x';
    await act(async () => {
      out = await result.current.signIn('  ada@example.com  ', 'pw');
    });

    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'pw',
    });
    expect(out).toBeNull();
  });

  it('returns the error message on failure', async () => {
    mockAuth.signInWithPassword.mockImplementation(async () => ({
      data: {},
      error: { message: 'Invalid login credentials' },
    }));

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.initializing).toBe(false));

    let out: string | null = null;
    await act(async () => {
      out = await result.current.signIn('ada@example.com', 'bad');
    });

    expect(out).toBe('Invalid login credentials');
  });
});

describe('signUp', () => {
  const ARGS = {
    firstName: '  Ada  ',
    lastName: '  Lovelace ',
    email: '  ada@example.com ',
    password: 'pw',
    tier: 'premium' as const,
  };

  it('trims the names and email and forwards tier in user metadata', async () => {
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.initializing).toBe(false));

    await act(async () => {
      await result.current.signUp(ARGS);
    });

    expect(mockAuth.signUp).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'pw',
      options: {
        data: { first_name: 'Ada', last_name: 'Lovelace', tier: 'premium' },
      },
    });
  });

  it('reports no error and no confirmation needed when a session comes back', async () => {
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.initializing).toBe(false));

    let out!: { error: string | null; needsEmailConfirmation: boolean };
    await act(async () => {
      out = await result.current.signUp(ARGS);
    });

    expect(out).toEqual({ error: null, needsEmailConfirmation: false });
  });

  it('flags needsEmailConfirmation when signUp returns no session', async () => {
    mockAuth.signUp.mockImplementation(async () => ({
      data: { user: { id: 'u1', identities: [{ id: 'i1' }] }, session: null },
      error: null,
    }));

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.initializing).toBe(false));

    let out!: { error: string | null; needsEmailConfirmation: boolean };
    await act(async () => {
      out = await result.current.signUp(ARGS);
    });

    expect(out).toEqual({ error: null, needsEmailConfirmation: true });
  });

  it('maps an "already registered" error to the friendly duplicate message', async () => {
    mockAuth.signUp.mockImplementation(async () => ({
      data: { user: null, session: null },
      error: { message: 'User already registered' },
    }));

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.initializing).toBe(false));

    let out!: { error: string | null; needsEmailConfirmation: boolean };
    await act(async () => {
      out = await result.current.signUp(ARGS);
    });

    expect(out).toEqual({
      error: 'An account with that email already exists. Try logging in.',
      needsEmailConfirmation: false,
    });
  });

  it('passes through any other error message verbatim', async () => {
    mockAuth.signUp.mockImplementation(async () => ({
      data: { user: null, session: null },
      error: { message: 'Password should be at least 6 characters' },
    }));

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.initializing).toBe(false));

    let out!: { error: string | null; needsEmailConfirmation: boolean };
    await act(async () => {
      out = await result.current.signUp(ARGS);
    });

    expect(out.error).toBe('Password should be at least 6 characters');
    expect(out.needsEmailConfirmation).toBe(false);
  });

  it('detects the empty-identities decoy user as a duplicate', async () => {
    mockAuth.signUp.mockImplementation(async () => ({
      data: { user: { id: 'decoy', identities: [] }, session: null },
      error: null,
    }));

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.initializing).toBe(false));

    let out!: { error: string | null; needsEmailConfirmation: boolean };
    await act(async () => {
      out = await result.current.signUp(ARGS);
    });

    expect(out).toEqual({
      error: 'An account with that email already exists. Try logging in.',
      needsEmailConfirmation: false,
    });
  });
});

describe('signOut', () => {
  it('calls supabase.auth.signOut', async () => {
    mockAuth.getSession.mockImplementation(async () => ({
      data: { session: SESSION },
      error: null,
    }));

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.profile).toEqual(PROFILE));

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockAuth.signOut).toHaveBeenCalledTimes(1);
  });

  // signOut surfaces error.message the way signIn and signUp do, so a failed
  // sign-out is no longer silent and uncatchable.
  it('resolves to the error message when signOut fails', async () => {
    mockAuth.signOut.mockImplementation(async () => ({
      error: { message: 'network error' },
    }));

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.initializing).toBe(false));

    let out: unknown = 'sentinel';
    await act(async () => {
      out = await result.current.signOut();
    });

    expect(out).toBe('network error');
    // Local state is untouched; only the onAuthStateChange callback clears it.
    expect(result.current.session).toBeNull();
  });

  it('resolves to null on a successful sign-out', async () => {
    mockAuth.signOut.mockImplementation(async () => ({ error: null }));

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.initializing).toBe(false));

    let out: unknown = 'sentinel';
    await act(async () => {
      out = await result.current.signOut();
    });

    expect(out).toBeNull();
  });
});

describe('updateProfile', () => {
  it('refuses when there is no session', async () => {
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.initializing).toBe(false));

    let out: string | null = null;
    await act(async () => {
      out = await result.current.updateProfile({ firstName: 'Ada' });
    });

    expect(out).toBe('Not signed in.');
  });

  it('trims the name patch, filters by id and stores the returned row', async () => {
    mockAuth.getSession.mockImplementation(async () => ({
      data: { session: SESSION },
      error: null,
    }));

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.profile).toEqual(PROFILE));

    const updated = { ...PROFILE, first_name: 'Grace' };
    profileQueue.push({ data: updated, error: null });

    let out: string | null = 'x';
    await act(async () => {
      out = await result.current.updateProfile({
        firstName: '  Grace ',
        lastName: ' Hopper  ',
      });
    });

    expect(updateCalls.at(-1)).toEqual([
      { first_name: 'Grace', last_name: 'Hopper' },
    ]);
    expect(eqCalls.at(-1)).toEqual(['id', 'user-1']);
    expect(out).toBeNull();
    expect(result.current.profile).toEqual(updated);
  });

  it('returns the update error message and leaves the profile alone', async () => {
    mockAuth.getSession.mockImplementation(async () => ({
      data: { session: SESSION },
      error: null,
    }));

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.profile).toEqual(PROFILE));

    profileQueue.push({ data: null, error: { message: 'update failed' } });

    let out: string | null = null;
    await act(async () => {
      out = await result.current.updateProfile({ firstName: 'Grace' });
    });

    expect(out).toBe('update failed');
    expect(result.current.profile).toEqual(PROFILE);
    expect(mockAuth.updateUser).not.toHaveBeenCalled();
  });

  it('changes the password only, without touching profiles', async () => {
    mockAuth.getSession.mockImplementation(async () => ({
      data: { session: SESSION },
      error: null,
    }));

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.profile).toEqual(PROFILE));

    const before = updateCalls.length;
    let out: string | null = 'x';
    await act(async () => {
      out = await result.current.updateProfile({ password: 'newpass' });
    });

    expect(updateCalls.length).toBe(before);
    expect(mockAuth.updateUser).toHaveBeenCalledWith({ password: 'newpass' });
    expect(out).toBeNull();
  });

  it('saves the name first and reports a partial success when the password fails', async () => {
    mockAuth.getSession.mockImplementation(async () => ({
      data: { session: SESSION },
      error: null,
    }));
    mockAuth.updateUser.mockImplementation(async () => ({
      data: {},
      error: { message: 'New password should be different' },
    }));

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.profile).toEqual(PROFILE));

    const updated = { ...PROFILE, first_name: 'Grace' };
    profileQueue.push({ data: updated, error: null });

    let out: string | null = null;
    await act(async () => {
      out = await result.current.updateProfile({
        firstName: 'Grace',
        password: 'newpass',
      });
    });

    expect(out).toBe(
      'Your name was saved, but the password was not: New password should be different',
    );
    // The name edit really was persisted.
    expect(result.current.profile).toEqual(updated);
  });

  it('sends only the fields that were provided', async () => {
    mockAuth.getSession.mockImplementation(async () => ({
      data: { session: SESSION },
      error: null,
    }));

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.profile).toEqual(PROFILE));

    profileQueue.push({ data: PROFILE, error: null });
    await act(async () => {
      await result.current.updateProfile({ lastName: 'Hopper' });
    });

    expect(updateCalls.at(-1)).toEqual([{ last_name: 'Hopper' }]);
  });

  // SUSPECTED BUG: an empty-string password is falsy, so `if (password)` skips
  // the update entirely and updateProfile reports success without changing it.
  it('SUSPECTED BUG: an empty-string password is silently skipped', async () => {
    mockAuth.getSession.mockImplementation(async () => ({
      data: { session: SESSION },
      error: null,
    }));

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.profile).toEqual(PROFILE));

    let out: string | null = 'x';
    await act(async () => {
      out = await result.current.updateProfile({ password: '' });
    });

    expect(mockAuth.updateUser).not.toHaveBeenCalled();
    expect(out).toBeNull();
  });
});

describe('changeTier', () => {
  it('refuses when there is no session', async () => {
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.initializing).toBe(false));

    let out: string | null = null;
    await act(async () => {
      out = await result.current.changeTier('premium');
    });

    expect(out).toBe('Not signed in.');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('calls the set_my_tier RPC and stores the returned profile', async () => {
    mockAuth.getSession.mockImplementation(async () => ({
      data: { session: SESSION },
      error: null,
    }));
    const upgraded = { ...PROFILE, tier: 'premium' as const };
    mockRpc.mockImplementation(async () => ({ data: upgraded, error: null }));

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.profile).toEqual(PROFILE));

    let out: string | null = 'x';
    await act(async () => {
      out = await result.current.changeTier('premium');
    });

    expect(mockRpc).toHaveBeenCalledWith('set_my_tier', {
      new_tier: 'premium',
    });
    expect(out).toBeNull();
    expect(result.current.profile).toEqual(upgraded);
  });

  it('returns the RPC error message and leaves the profile alone', async () => {
    mockAuth.getSession.mockImplementation(async () => ({
      data: { session: SESSION },
      error: null,
    }));
    mockRpc.mockImplementation(async () => ({
      data: null,
      error: { message: 'rpc denied' },
    }));

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.profile).toEqual(PROFILE));

    let out: string | null = null;
    await act(async () => {
      out = await result.current.changeTier('basic');
    });

    expect(out).toBe('rpc denied');
    expect(result.current.profile).toEqual(PROFILE);
  });

  it('succeeds without updating the profile when the RPC returns no row', async () => {
    mockAuth.getSession.mockImplementation(async () => ({
      data: { session: SESSION },
      error: null,
    }));
    mockRpc.mockImplementation(async () => ({ data: null, error: null }));

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.profile).toEqual(PROFILE));

    let out: string | null = 'x';
    await act(async () => {
      out = await result.current.changeTier('basic');
    });

    expect(out).toBeNull();
    expect(result.current.profile).toEqual(PROFILE);
  });
});
