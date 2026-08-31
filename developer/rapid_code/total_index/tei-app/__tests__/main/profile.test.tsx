import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import Profile from '../../app/profile';
import { useAuth } from '../../src/auth';
import {
  MainProviders,
  makeAuth,
  makeProfile,
  renderMain,
} from '../helpers/mainRender';

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
    // The wordmark is now Ken's artwork rather than a text node, so it is
    // reached by its accessibility label like every other lockup site.
    expect(screen.getByLabelText('RHINO ATHLETICS')).toBeTruthy();
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

  /* ------------------------------------------------------------------ */
  /* Tier-specific attributes (Edit Profile mock-ups, Aug 2026)          */
  /* ------------------------------------------------------------------ */

  describe('tier attributes', () => {
    const swatch = (name: string) =>
      screen.queryByLabelText(new RegExp(`^${name} accent colour`));

    describe('elemental', () => {
      it('shows no accent swatches and no theme row', () => {
        signedIn({ profile: makeProfile({ tier: 'elemental' }) });
        renderMain(<Profile />);

        expect(
          screen.queryByText(/Preferred Accent Color for the App/),
        ).toBeNull();
        expect(screen.queryByText('Theme')).toBeNull();
        expect(swatch('Orange')).toBeNull();
        expect(screen.queryByLabelText(/accent colour/)).toBeNull();
      });

      it('still offers Upgrade', () => {
        signedIn({ profile: makeProfile({ tier: 'elemental' }) });
        renderMain(<Profile />);
        expect(screen.getByText('Upgrade')).toBeTruthy();
      });
    });

    describe('basic', () => {
      beforeEach(() => {
        signedIn({ profile: makeProfile({ tier: 'basic' }) });
      });

      it('shows the accent caption and exactly two swatches', () => {
        renderMain(<Profile />);

        expect(
          screen.getByText('YOUR Preferred Accent Color for the App'),
        ).toBeTruthy();
        expect(screen.getAllByLabelText(/accent colour/)).toHaveLength(2);
        expect(swatch('Orange')).toBeTruthy();
        expect(swatch('Lime')).toBeTruthy();
      });

      it('shows no theme row — that is Premium only', () => {
        renderMain(<Profile />);
        expect(screen.queryByText('Theme')).toBeNull();
        expect(screen.queryByLabelText('Dark Mode')).toBeNull();
        expect(screen.queryByLabelText('Light Mode')).toBeNull();
      });

      it('still offers Upgrade', () => {
        renderMain(<Profile />);
        expect(screen.getByText('Upgrade')).toBeTruthy();
      });
    });

    describe('premium', () => {
      beforeEach(() => {
        signedIn({ profile: makeProfile({ tier: 'premium' }) });
      });

      it('shows all eleven swatches', () => {
        renderMain(<Profile />);
        expect(screen.getAllByLabelText(/accent colour/)).toHaveLength(11);
      });

      it('shows the theme row with Dark selected by default', () => {
        renderMain(<Profile />);

        expect(screen.getByText('Theme')).toBeTruthy();
        expect(screen.getByLabelText('Dark Mode')).toBeTruthy();
        expect(screen.getByLabelText('Light Mode')).toBeTruthy();
        expect(screen.getByLabelText('Dark Mode')).toBeSelected();
        expect(screen.getByLabelText('Light Mode')).not.toBeSelected();
      });

      it('has NO Upgrade button — it is already the top tier', () => {
        renderMain(<Profile />);
        expect(screen.queryByText('Upgrade')).toBeNull();
      });
    });

    describe('selection', () => {
      it("marks the profile's saved accent as the selected swatch", () => {
        signedIn({
          profile: makeProfile({ tier: 'basic', accent_color: '#81D742' }),
        });
        renderMain(<Profile />);

        expect(swatch('Lime')).toBeSelected();
        expect(swatch('Orange')).not.toBeSelected();
      });

      it('moves the selection when another swatch is tapped', () => {
        signedIn({ profile: makeProfile({ tier: 'premium' }) });
        renderMain(<Profile />);

        fireEvent.press(swatch('Blue')!);

        expect(swatch('Blue')).toBeSelected();
        expect(swatch('Orange')).not.toBeSelected();
      });

      it('moves the theme selection when Light Mode is tapped', () => {
        signedIn({ profile: makeProfile({ tier: 'premium' }) });
        renderMain(<Profile />);

        fireEvent.press(screen.getByLabelText('Light Mode'));

        expect(screen.getByLabelText('Light Mode')).toBeSelected();
        expect(screen.getByLabelText('Dark Mode')).not.toBeSelected();
      });

      it('seeds the theme from a profile that arrives after first render', () => {
        signedIn({ profile: null });
        const view = renderMain(<Profile />);

        signedIn({ profile: makeProfile({ tier: 'premium', theme: 'light' }) });
        // rerender() replaces the element inside the wrapper, so the providers
        // have to be supplied again here.
        view.rerender(
          <MainProviders>
            <Profile />
          </MainProviders>,
        );

        expect(screen.getByLabelText('Light Mode')).toBeSelected();
      });
    });

    describe('persistence', () => {
      it('persists the chosen accent through the auth layer', async () => {
        const auth = signedIn({ profile: makeProfile({ tier: 'basic' }) });
        renderMain(<Profile />);

        fireEvent.press(swatch('Lime')!);
        await act(async () => {
          fireEvent.press(screen.getByText(/Save Changes/));
        });

        expect(auth.updateProfile).toHaveBeenCalledWith(
          expect.objectContaining({ accentColor: '#81D742' }),
        );
      });

      it('persists the accent and theme together on Premium', async () => {
        const auth = signedIn({ profile: makeProfile({ tier: 'premium' }) });
        renderMain(<Profile />);

        fireEvent.press(swatch('Pink')!);
        fireEvent.press(screen.getByLabelText('Light Mode'));
        await act(async () => {
          fireEvent.press(screen.getByText(/Save Changes/));
        });

        expect(auth.updateProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            accentColor: '#FF46A3',
            theme: 'light',
          }),
        );
      });

      it('sends no accent or theme for Elemental, which cannot set either', async () => {
        const auth = signedIn({ profile: makeProfile({ tier: 'elemental' }) });
        renderMain(<Profile />);

        await act(async () => {
          fireEvent.press(screen.getByText(/Save Changes/));
        });

        expect(auth.updateProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            accentColor: undefined,
            theme: undefined,
          }),
        );
      });

      it('sends no theme for Basic, which has no theme row', async () => {
        const auth = signedIn({ profile: makeProfile({ tier: 'basic' }) });
        renderMain(<Profile />);

        await act(async () => {
          fireEvent.press(screen.getByText(/Save Changes/));
        });

        expect(auth.updateProfile).toHaveBeenCalledWith(
          expect.objectContaining({ theme: undefined }),
        );
      });

      it('surfaces the error and keeps the choice on screen when the save fails', async () => {
        signedIn({
          profile: makeProfile({ tier: 'premium' }),
          updateProfile: jest.fn(async () => 'Network unreachable'),
        });
        renderMain(<Profile />);

        fireEvent.press(swatch('Red')!);
        await act(async () => {
          fireEvent.press(screen.getByText(/Save Changes/));
        });

        expect(screen.getByText('Network unreachable')).toBeTruthy();
        expect(router.replace).not.toHaveBeenCalledWith('/home');
        // The user's pick is not thrown away by the failure.
        expect(swatch('Red')).toBeSelected();
      });
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
