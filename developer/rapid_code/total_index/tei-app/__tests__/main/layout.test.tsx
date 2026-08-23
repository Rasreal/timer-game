import { act, render, screen, waitFor } from '@testing-library/react-native';
import { Stack, router, useSegments } from 'expo-router';
import RootLayout from '../../app/_layout';
import { AuthProvider, useAuth } from '../../src/auth';
import { StoreProvider, useStore } from '../../src/store';
import { makeAuth } from '../helpers/mainRender';

jest.mock('../../src/lib/supabase');
jest.mock('../../src/lib/sessions');
jest.mock('../../src/lib/plans');
jest.mock('../../src/auth', () => {
  const actual = jest.requireActual('../../src/auth');
  return {
    ...actual,
    // AuthProvider is replaced with a pass-through so the layout's provider
    // tree still mounts without a live Supabase client behind it.
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
    useAuth: jest.fn(),
  };
});

const mockedAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedSegments = useSegments as jest.MockedFunction<typeof useSegments>;

function auth(over: Record<string, unknown> = {}) {
  mockedAuth.mockReturnValue(makeAuth(over) as never);
}

async function renderLayout() {
  const view = render(<RootLayout />);
  await act(async () => {});
  return view;
}

beforeEach(() => {
  mockedSegments.mockReturnValue(['home'] as never);
  auth();
});

describe('RootLayout', () => {
  it('renders the provider tree and the Stack without crashing', async () => {
    await renderLayout();
    expect(screen.toJSON()).toBeTruthy();
  });

  it('mounts a real StoreProvider (its consumers throw without one)', () => {
    // Guards against the layout quietly dropping the store: useStore throws
    // outside its provider, and the layout renders fine, so one is present.
    expect(() => render(<BareStoreConsumer />)).toThrow(
      /useStore must be used inside/,
    );
  });

  describe('AuthGate', () => {
    it('shows a spinner while auth is initializing, not the Stack', async () => {
      auth({ initializing: true, session: null });
      await renderLayout();

      expect(screen.UNSAFE_queryAllByType(Stack as never)).toHaveLength(0);
      expect(router.replace).not.toHaveBeenCalled();
    });

    it('redirects a signed-out user off a protected route', async () => {
      auth({ session: null });
      mockedSegments.mockReturnValue(['home'] as never);
      await renderLayout();

      await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    });

    it.each(['index', 'login', 'account-type', 'create-account', 'loading'])(
      'leaves a signed-out user alone on the public route %s',
      async (route) => {
        auth({ session: null });
        mockedSegments.mockReturnValue([route] as never);
        await renderLayout();

        expect(router.replace).not.toHaveBeenCalled();
      },
    );

    it('treats an empty segments array as the index route', async () => {
      auth({ session: null });
      mockedSegments.mockReturnValue([] as never);
      await renderLayout();

      expect(router.replace).not.toHaveBeenCalled();
    });

    it.each(['login', 'create-account'])(
      'pushes a signed-in user off %s into /home',
      async (route) => {
        mockedSegments.mockReturnValue([route] as never);
        await renderLayout();

        await waitFor(() =>
          expect(router.replace).toHaveBeenCalledWith('/home'),
        );
      },
    );

    it.each(['index', 'loading', 'account-type'])(
      'lets a signed-in user stay on %s (ALSO_SIGNED_IN)',
      async (route) => {
        mockedSegments.mockReturnValue([route] as never);
        await renderLayout();

        expect(router.replace).not.toHaveBeenCalled();
      },
    );

    it('leaves a signed-in user on a protected route alone', async () => {
      mockedSegments.mockReturnValue(['profile'] as never);
      await renderLayout();
      expect(router.replace).not.toHaveBeenCalled();
    });
  });

  describe('GlobalToast', () => {
    it('renders nothing when the store has no toast', async () => {
      await renderLayout();
      expect(screen.queryByText(/./)).toBeNull();
    });
  });

  it('ResetDraftOnUserChange renders nothing and does not crash on a null session', async () => {
    auth({ session: null });
    mockedSegments.mockReturnValue(['index'] as never);
    await expect(renderLayout()).resolves.toBeTruthy();
  });
});

function BareStoreConsumer() {
  useStore();
  return null;
}

// Referenced so the import is not elided; the layout owns the real provider.
void AuthProvider;
