import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import Home from '../../app/home';
import { SESSION_TARGET } from '../../src/lib/tei';
import { useEffect } from 'react';
import { useStore, type SessionDraft } from '../../src/store';
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
  it('renders the stacked TEI lockup and the four tiles', () => {
    renderMain(<Home />);

    for (const word of ['TOTAL', 'EFFECT', 'INDEX', 'TEI']) {
      expect(screen.getByText(word)).toBeTruthy();
    }
    expect(screen.getByText('Ready to train')).toBeTruthy();

    expect(screen.getByLabelText('Calculate Session')).toBeTruthy();
    expect(screen.getByLabelText('Review')).toBeTruthy();
    expect(screen.getByLabelText('Plan TEI')).toBeTruthy();
    expect(screen.getByLabelText('Profile')).toBeTruthy();
  });

  it("greets the member by first name, as on the Basic mock-up", () => {
    renderMain(<Home />);
    expect(screen.getByText('Ada')).toBeTruthy();
    expect(screen.queryByText('Ada Lovelace')).toBeNull();
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
      // One session against its share of the weekly target (60.5 / 3).
      expect(screen.getByText(`${Math.round((27 / SESSION_TARGET) * 100)}%`)).toBeTruthy();
      expect(screen.getByText(/of Target/)).toBeTruthy();
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
      expect(await screen.findByText('14')).toBeTruthy();

      // A newer session is logged while Home sits in the background.
      mockedLatest.mockResolvedValue({
        data: makeSession({ tei: 52.4 }),
        error: null,
      });
      await act(async () => {
        (require('expo-router') as { __refocus: () => void }).__refocus();
      });

      expect(await screen.findByText('52')).toBeTruthy();
      expect(mockedLatest).toHaveBeenCalledTimes(2);
    });

    it('shows the big Last TEI as a whole number, like the calendar and calculators', async () => {
      signedIn({ profile: makeProfile({ tier: 'premium' }) });
      mockedLatest.mockResolvedValue({ data: makeSession({ tei: 21.4 }), error: null });
      renderMain(<Home />);

      expect(await screen.findByText('21')).toBeTruthy();
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
      expect(screen.queryByText(/of Target/)).toBeNull();
      expect(screen.queryByText('No sessions yet')).toBeNull();
      // Same layout as Basic: the big number reads 0 and the Last TEI line
      // points at the upgrade instead.
      expect(screen.getByText('0')).toBeTruthy();
      fireEvent.press(screen.getByLabelText('Last TEI is on TEI Basic. See plans.'));
      expect(router.push).toHaveBeenCalledWith('/account-type');
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

    it('offers Change Subscription rather than Upgrade', () => {
      renderMain(<Home />);
      expect(screen.queryByText('Upgrade')).toBeNull();
      fireEvent.press(screen.getByText('Change Subscription'));
      expect(router.push).toHaveBeenCalledWith('/account-type');
    });

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

  describe('tile ellipsis options', () => {
    function choose(tile: string, option: string) {
      fireEvent.press(screen.getByLabelText(`${tile} options`));
      fireEvent.press(screen.getByLabelText(option));
    }

    it('Calculate offers its three help options and routes the chosen one', () => {
      signedIn({ profile: makeProfile({ tier: 'elemental' }) });
      renderMain(<Home />);

      fireEvent.press(screen.getByLabelText('Calculate Session options'));
      expect(screen.getByText('How can we help you CALCULATE?')).toBeTruthy();
      expect(screen.getAllByRole('radio')).toHaveLength(3);

      fireEvent.press(screen.getByLabelText('How important is “Perceived Exertion”?'));
      fireEvent.press(screen.getByText('Select this CALCULATE Option'));
      expect(router.push).toHaveBeenCalledWith('/info/exertion');
    });

    it('needs an option ticked before Select does anything', () => {
      renderMain(<Home />);
      fireEvent.press(screen.getByLabelText('Calculate Session options'));
      fireEvent.press(screen.getByText('Select this CALCULATE Option'));
      expect(router.push).not.toHaveBeenCalled();
    });

    it('Review offers the four options from the 22 Oct edits', () => {
      signedIn({ profile: makeProfile({ tier: 'basic' }) });
      renderMain(<Home />);

      fireEvent.press(screen.getByLabelText('Review options'));
      expect(screen.getByText('What would you like to REVIEW?')).toBeTruthy();
      expect(screen.getAllByRole('radio')).toHaveLength(4);

      fireEvent.press(screen.getByLabelText('SNAPSHOT of previous full week.'));
      fireEvent.press(screen.getByText('Select this REVIEW Option'));
      expect(router.push).toHaveBeenCalledWith('/review-snapshot');
    });

    it.each([
      ['A detailed look at a Week or Month.', '/review'],
      ['How to interpret your TEI score.', '/training-scale'],
      ['How to use REVIEW video.', '/info/review-video'],
    ])('Review option "%s" routes to %s', (label, route) => {
      signedIn({ profile: makeProfile({ tier: 'basic' }) });
      renderMain(<Home />);
      choose('Review', label);
      fireEvent.press(screen.getByText('Select this REVIEW Option'));
      expect(router.push).toHaveBeenCalledWith(route);
    });

    it('Profile offers the quiz', () => {
      renderMain(<Home />);
      choose('Profile', 'What kind of athlete are you?');
      fireEvent.press(screen.getByText('Select this PROFILE Option'));
      expect(router.push).toHaveBeenCalledWith('/athlete-quiz');
    });

    it('Plan options open on Premium', () => {
      signedIn({ profile: makeProfile({ tier: 'premium' }) });
      renderMain(<Home />);
      choose('Plan TEI', 'Setting your weekly Target.');
      fireEvent.press(screen.getByText('Select this PLAN Option'));
      expect(router.push).toHaveBeenCalledWith('/info/plan-target');
    });

    it('a locked tile has no options on Elemental', () => {
      signedIn({ profile: makeProfile({ tier: 'elemental' }) });
      renderMain(<Home />);
      expect(screen.queryByLabelText('Review options')).toBeNull();
      expect(screen.queryByLabelText('Plan TEI options')).toBeNull();
      expect(screen.getByLabelText('Calculate Session options')).toBeTruthy();
      expect(screen.getByLabelText('Profile options')).toBeTruthy();
    });

    it('Plan stays without options on Basic', () => {
      signedIn({ profile: makeProfile({ tier: 'basic' }) });
      renderMain(<Home />);
      expect(screen.queryByLabelText('Plan TEI options')).toBeNull();
      expect(screen.getByLabelText('Review options')).toBeTruthy();
    });

    it('the close cross dismisses the options', () => {
      renderMain(<Home />);
      fireEvent.press(screen.getByLabelText('Profile options'));
      expect(screen.getByText('How can we help with your PROFILE?')).toBeTruthy();
      fireEvent.press(screen.getByLabelText('Close options'));
      expect(screen.queryByText('How can we help with your PROFILE?')).toBeNull();
    });
  });

  it('Calculate Session always starts a blank draft — no leftover values or edit mode', async () => {
    let draft: SessionDraft | null = null;
    function Probe() {
      const store = useStore();
      const { loadSession } = store;
      draft = store.session;
      useEffect(() => loadSession(makeSession({ id: 'old' })), [loadSession]);
      return null;
    }
    signedIn({ profile: makeProfile({ tier: 'basic' }) });
    renderMain(
      <>
        <Probe />
        <Home />
      </>,
    );
    await waitFor(() => expect(draft?.editing?.id).toBe('old'));

    fireEvent.press(screen.getByLabelText('Calculate Session'));
    expect(draft!.editing).toBeUndefined();
    expect(draft!.sets).toBeNull();
    expect(draft!.cardioMinutes).toBeNull();
    expect(router.push).toHaveBeenCalledWith('/calculator');
  });
});
