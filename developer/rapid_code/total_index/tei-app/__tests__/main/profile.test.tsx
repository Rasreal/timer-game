import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import Profile from '../../app/profile';
import { useAuth } from '../../src/auth';
import { makeAuth, makeProfile, renderMain } from '../helpers/mainRender';

jest.mock('../../src/lib/supabase');
jest.mock('../../src/lib/sessions');
jest.mock('../../src/lib/plans');
jest.mock('../../src/auth');

const mockedAuth = useAuth as jest.MockedFunction<typeof useAuth>;

function signedIn(over: Record<string, unknown> = {}) {
  const value = makeAuth(over);
  mockedAuth.mockReturnValue(value as never);
  return value;
}

beforeEach(() => {
  signedIn();
});

describe('Profile', () => {
  it('renders the heading and the brand wordmark', () => {
    renderMain(<Profile />);
    expect(screen.getByText('Edit Profile')).toBeTruthy();
    expect(screen.getByText('RHINO ATHLETICS')).toBeTruthy();
  });

  it("seeds the name fields from the user's profile", () => {
    renderMain(<Profile />);
    expect(screen.getByDisplayValue('Ada')).toBeTruthy();
    expect(screen.getByDisplayValue('Lovelace')).toBeTruthy();
  });

  it('renders the email read-only (as text, not an input)', () => {
    renderMain(<Profile />);
    expect(screen.getByText('ada@example.com')).toBeTruthy();
    expect(screen.queryByDisplayValue('ada@example.com')).toBeNull();
  });

  it('renders the three password rules', () => {
    renderMain(<Profile />);
    // Each Rule renders "○ " and its text as two children of one <Text>.
    expect(screen.getByText(/At least 8 characters/)).toBeTruthy();
    expect(screen.getByText(/At least one number/)).toBeTruthy();
    expect(screen.getByText(/At least one upper case letter/)).toBeTruthy();
  });

  it('toggles the password visibility control', () => {
    renderMain(<Profile />);
    fireEvent.press(screen.getByLabelText('Show password'));
    expect(screen.getByLabelText('Hide password')).toBeTruthy();
  });

  describe('tier display', () => {
    it.each([
      ['elemental', 'Elemental'],
      ['basic', 'Basic'],
      ['premium', 'Premium'],
    ] as const)('shows %s as "%s"', (tier, label) => {
      signedIn({ profile: makeProfile({ tier }) });
      renderMain(<Profile />);
      expect(screen.getByText(label)).toBeTruthy();
    });

    it('falls back to Elemental when there is no profile', () => {
      signedIn({ profile: null });
      renderMain(<Profile />);
      expect(screen.getByText('Elemental')).toBeTruthy();
    });
  });

  describe('sign out', () => {
    it('calls the auth signOut', async () => {
      const auth = signedIn();
      renderMain(<Profile />);

      await act(async () => {
        fireEvent.press(screen.getByText('Sign Out'));
      });

      expect(auth.signOut).toHaveBeenCalledTimes(1);
    });

    it('does not navigate itself — AuthGate handles the redirect', async () => {
      renderMain(<Profile />);
      await act(async () => {
        fireEvent.press(screen.getByText('Sign Out'));
      });
      expect(router.replace).not.toHaveBeenCalled();
      expect(router.push).not.toHaveBeenCalled();
    });
  });

  describe('save', () => {
    it('calls updateProfile with the edited names and no password', async () => {
      const auth = signedIn();
      renderMain(<Profile />);

      fireEvent.changeText(screen.getByDisplayValue('Ada'), 'Grace');
      fireEvent.changeText(screen.getByDisplayValue('Lovelace'), 'Hopper');

      await act(async () => {
        fireEvent.press(screen.getByText(/Save Changes/));
      });

      expect(auth.updateProfile).toHaveBeenCalledWith({
        firstName: 'Grace',
        lastName: 'Hopper',
        password: undefined,
      });
    });

    it('passes the password through when one is typed', async () => {
      const auth = signedIn();
      renderMain(<Profile />);

      fireEvent.changeText(
        screen.getByPlaceholderText('**************'),
        'Password1',
      );

      await act(async () => {
        fireEvent.press(screen.getByText(/Save Changes/));
      });

      expect(auth.updateProfile).toHaveBeenCalledWith({
        firstName: 'Ada',
        lastName: 'Lovelace',
        password: 'Password1',
      });
    });

    it('toasts and returns home on success', async () => {
      renderMain(<Profile />);
      await act(async () => {
        fireEvent.press(screen.getByText(/Save Changes/));
      });

      await waitFor(() => expect(screen.getByTestId('toast')).toBeTruthy());
      expect(screen.getByTestId('toast')).toHaveTextContent('Profile saved');
      expect(router.replace).toHaveBeenCalledWith('/home');
    });

    it('surfaces the error message and stays put on failure', async () => {
      signedIn({ updateProfile: jest.fn(async () => 'Password too weak') });
      renderMain(<Profile />);

      await act(async () => {
        fireEvent.press(screen.getByText(/Save Changes/));
      });

      expect(screen.getByText('Password too weak')).toBeTruthy();
      expect(router.replace).not.toHaveBeenCalledWith('/home');
    });

    it('does nothing when the password fails the rules', async () => {
      const auth = signedIn();
      renderMain(<Profile />);

      fireEvent.changeText(screen.getByPlaceholderText('**************'), 'short');
      await act(async () => {
        fireEvent.press(screen.getByText(/Save Changes/));
      });

      expect(auth.updateProfile).not.toHaveBeenCalled();
    });

    it('does nothing when a name is blanked out', async () => {
      const auth = signedIn();
      renderMain(<Profile />);

      fireEvent.changeText(screen.getByDisplayValue('Ada'), '   ');
      await act(async () => {
        fireEvent.press(screen.getByText(/Save Changes/));
      });

      expect(auth.updateProfile).not.toHaveBeenCalled();
    });
  });

  describe('navigation', () => {
    it('the back arrow replaces to /home', () => {
      renderMain(<Profile />);
      fireEvent.press(screen.getByLabelText('Back'));
      expect(router.replace).toHaveBeenCalledWith('/home');
    });

    it('Upgrade routes to /account-type', () => {
      renderMain(<Profile />);
      fireEvent.press(screen.getByText('Upgrade'));
      expect(router.push).toHaveBeenCalledWith('/account-type');
    });

    it('the subscription ellipsis routes to /account-type', () => {
      renderMain(<Profile />);
      fireEvent.press(screen.getByLabelText('Change subscription'));
      expect(router.push).toHaveBeenCalledWith('/account-type');
    });
  });

  // SUSPECTED BUG (minor): the email-change explainer is hidden behind
  // SHOW_DEV_TOOLS, which is off by default, so the read-only email field
  // ships with no explanation of why it cannot be edited.
  it('SUSPECTED BUG: hides the read-only-email explainer unless SHOW_DEV_TOOLS is on', () => {
    renderMain(<Profile />);
    expect(
      screen.queryByText(
        'Changing your email needs a confirmation link — not wired up yet.',
      ),
    ).toBeNull();
  });
});
