import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import Home from '../../app/home';
import * as sessions from '../../src/lib/sessions';
import { useAuth } from '../../src/auth';
import { makeAuth, makeProfile, makeSession, renderMain } from '../helpers/mainRender';

jest.mock('../../src/lib/supabase');
jest.mock('../../src/lib/sessions');
jest.mock('../../src/lib/plans');
jest.mock('../../src/auth');

const mockedAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedLatest = sessions.latestSession as jest.MockedFunction<
  typeof sessions.latestSession
>;

function signedIn(over: Record<string, unknown> = {}) {
  mockedAuth.mockReturnValue(makeAuth(over) as never);
}

beforeEach(() => {
  mockedLatest.mockResolvedValue({ data: makeSession({ tei: 27 }), error: null });
  signedIn();
});

describe('Home', () => {
  it('renders the brand + TEI lockups and the four tiles', () => {
    renderMain(<Home />);

    expect(screen.getByText('TOTAL EFFECT INDEX')).toBeTruthy();
    expect(screen.getByText('TEI')).toBeTruthy();
    expect(screen.getByText('Ready to train')).toBeTruthy();

    expect(screen.getByLabelText('Calculate Session')).toBeTruthy();
    expect(screen.getByLabelText('Review')).toBeTruthy();
    expect(screen.getByLabelText('Plan TEI')).toBeTruthy();
    expect(screen.getByLabelText('Profile')).toBeTruthy();
  });

  it("renders the signed-in user's full name", () => {
    renderMain(<Home />);
    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
  });

  it('falls back to the email when both names are blank', () => {
    signedIn({ profile: makeProfile({ first_name: '', last_name: '' }) });
    renderMain(<Home />);
    expect(screen.getByText('ada@example.com')).toBeTruthy();
  });

  it('renders a blank name row while the profile is still null', () => {
    signedIn({ profile: null });
    renderMain(<Home />);
    // No crash, and the greeting still paints.
    expect(screen.getByText('Ready to train')).toBeTruthy();
  });

  it('shows a tappable profile-load error instead of the name', () => {
    const reloadProfile = jest.fn();
    signedIn({ profile: null, profileError: 'Could not load your profile.', reloadProfile });
    renderMain(<Home />);

    const err = screen.getByText('Could not load your profile.');
    expect(err).toBeTruthy();
    fireEvent.press(err);
    expect(reloadProfile).toHaveBeenCalled();
  });

  describe('latest-session score', () => {
    it("loads and renders the latest session's TEI on a paid tier", async () => {
      signedIn({ profile: makeProfile({ tier: 'basic' }) });
      mockedLatest.mockResolvedValue({ data: makeSession({ tei: 27 }), error: null });
      renderMain(<Home />);

      await waitFor(() => expect(mockedLatest).toHaveBeenCalled());
      expect(await screen.findByText('27')).toBeTruthy();
      expect(screen.getByText('Last session TEI')).toBeTruthy();
    });

    it('re-reads the score when the screen is focused again', async () => {
      // Home stays MOUNTED while the calculator is pushed over it, so a
      // mount-only effect left a stale score after a session was logged.
      // __refocus() re-fires the focus callback without remounting, which is
      // what returning from a pushed route actually does.
      signedIn({ profile: makeProfile({ tier: 'premium' }) });
      mockedLatest.mockResolvedValue({
        data: makeSession({ tei: 13.78 }),
        error: null,
      });
      renderMain(<Home />);
      expect(await screen.findByText('13.8')).toBeTruthy();

      // A newer session is logged while Home sits in the background.
      mockedLatest.mockResolvedValue({
        data: makeSession({ tei: 52.4 }),
        error: null,
      });
      await act(async () => {
        (require('expo-router') as { __refocus: () => void }).__refocus();
      });

      expect(await screen.findByText('52.4')).toBeTruthy();
      expect(mockedLatest).toHaveBeenCalledTimes(2);
    });

    it('keeps one decimal on a non-integer score', async () => {
      signedIn({ profile: makeProfile({ tier: 'premium' }) });
      mockedLatest.mockResolvedValue({ data: makeSession({ tei: 21.5 }), error: null });
      renderMain(<Home />);

      expect(await screen.findByText('21.5')).toBeTruthy();
    });

    it('shows a zero/empty state when there is no session yet', async () => {
      signedIn({ profile: makeProfile({ tier: 'basic' }) });
      mockedLatest.mockResolvedValue({ data: null, error: null });
      renderMain(<Home />);

      await waitFor(() => expect(mockedLatest).toHaveBeenCalled());
      expect(screen.getByText('0')).toBeTruthy();
      expect(screen.getByText('No sessions yet')).toBeTruthy();
      expect(screen.getByText('Ready to train')).toBeTruthy();
    });

    // A permission or network failure must not read as "no sessions yet".
    it('surfaces a load failure instead of the empty state', async () => {
      signedIn({ profile: makeProfile({ tier: 'basic' }) });
      mockedLatest.mockResolvedValue({
        data: null,
        error: 'permission denied',
      });
      renderMain(<Home />);

      expect(
        await screen.findByText(
          'Could not load your last session: permission denied',
        ),
      ).toBeTruthy();
      expect(screen.queryByText('No sessions yet')).toBeNull();
    });

    // Elemental is calculate-only by design, so there is no history to read.
    it('never queries history on Elemental, and shows no score', async () => {
      signedIn({ profile: makeProfile({ tier: 'elemental' }) });
      mockedLatest.mockResolvedValue({ data: makeSession({ tei: 27 }), error: null });
      renderMain(<Home />);

      await act(async () => {});
      expect(mockedLatest).not.toHaveBeenCalled();
      expect(screen.queryByText('27')).toBeNull();
      expect(screen.queryByText('Last session TEI')).toBeNull();
      expect(screen.queryByText('No sessions yet')).toBeNull();
    });

    it('shows no score while the profile is still loading', async () => {
      signedIn({ profile: null });
      renderMain(<Home />);

      await act(async () => {});
      expect(mockedLatest).not.toHaveBeenCalled();
      expect(screen.queryByText('No sessions yet')).toBeNull();
    });
  });

  describe('navigation — Elemental (free) user', () => {
    beforeEach(() => signedIn({ profile: makeProfile({ tier: 'elemental' }) }));

    it('Calculate Session goes straight to /calculator', () => {
      renderMain(<Home />);
      fireEvent.press(screen.getByLabelText('Calculate Session'));
      expect(router.push).toHaveBeenCalledWith('/calculator');
    });

    it('Review is locked and toasts instead of navigating', () => {
      renderMain(<Home />);
      fireEvent.press(screen.getByLabelText('Review'));
      expect(router.push).not.toHaveBeenCalledWith('/review');
      expect(
        screen.getByText('Review is available on TEI Basic and Premium.'),
      ).toBeTruthy();
    });

    it('Plan TEI is locked and toasts instead of navigating', () => {
      renderMain(<Home />);
      fireEvent.press(screen.getByLabelText('Plan TEI'));
      expect(router.push).not.toHaveBeenCalledWith('/plan');
      expect(screen.getByText('Plan TEI is available on TEI Premium.')).toBeTruthy();
    });

    it('Profile routes to /profile', () => {
      renderMain(<Home />);
      fireEvent.press(screen.getByLabelText('Profile'));
      expect(router.push).toHaveBeenCalledWith('/profile');
    });

    it('Upgrade routes to /account-type', () => {
      renderMain(<Home />);
      fireEvent.press(screen.getByText('Upgrade'));
      expect(router.push).toHaveBeenCalledWith('/account-type');
    });
  });

  describe('navigation — Basic user', () => {
    beforeEach(() => signedIn({ profile: makeProfile({ tier: 'basic' }) }));

    it('Calculate Session still goes to /calculator (only Premium picks a type)', () => {
      renderMain(<Home />);
      fireEvent.press(screen.getByLabelText('Calculate Session'));
      expect(router.push).toHaveBeenCalledWith('/calculator');
    });

    it('Review is unlocked and routes to /review', () => {
      renderMain(<Home />);
      fireEvent.press(screen.getByLabelText('Review'));
      expect(router.push).toHaveBeenCalledWith('/review');
    });

    it('Plan TEI is still locked on Basic', () => {
      renderMain(<Home />);
      fireEvent.press(screen.getByLabelText('Plan TEI'));
      expect(router.push).not.toHaveBeenCalledWith('/plan');
      expect(screen.getByText('Plan TEI is available on TEI Premium.')).toBeTruthy();
    });
  });

  describe('navigation — Premium user', () => {
    beforeEach(() => signedIn({ profile: makeProfile({ tier: 'premium' }) }));

    it('Calculate Session goes to /session-type', () => {
      renderMain(<Home />);
      fireEvent.press(screen.getByLabelText('Calculate Session'));
      expect(router.push).toHaveBeenCalledWith('/session-type');
    });

    it('Review routes to /review', () => {
      renderMain(<Home />);
      fireEvent.press(screen.getByLabelText('Review'));
      expect(router.push).toHaveBeenCalledWith('/review');
    });

    it('Plan TEI routes to /plan', () => {
      renderMain(<Home />);
      fireEvent.press(screen.getByLabelText('Plan TEI'));
      expect(router.push).toHaveBeenCalledWith('/plan');
    });
  });

  it('locks both Review and Plan when the profile has not loaded yet', () => {
    signedIn({ profile: null });
    renderMain(<Home />);

    fireEvent.press(screen.getByLabelText('Review'));
    fireEvent.press(screen.getByLabelText('Plan TEI'));
    expect(router.push).not.toHaveBeenCalledWith('/review');
    expect(router.push).not.toHaveBeenCalledWith('/plan');
  });
});
