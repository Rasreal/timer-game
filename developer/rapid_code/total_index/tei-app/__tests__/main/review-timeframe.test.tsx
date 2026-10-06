import { screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import ReviewTimeframe from '../../app/review-timeframe';
import { useAuth } from '../../src/auth';
import * as sessions from '../../src/lib/sessions';
import * as plans from '../../src/lib/plans';
import { dayKey, makeAuth, makePlan, makeProfile, makeSession, renderMain } from '../helpers/mainRender';

jest.mock('../../src/lib/supabase');
jest.mock('../../src/lib/sessions');
jest.mock('../../src/lib/plans', () => ({
  ...jest.requireActual('../../src/lib/plans'),
  listPlansBetween: jest.fn(),
}));
jest.mock('../../src/auth');

const mockedAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const listSessions = sessions.listSessionsBetween as jest.MockedFunction<typeof sessions.listSessionsBetween>;
const listPlans = plans.listPlansBetween as jest.MockedFunction<typeof plans.listPlansBetween>;

function signedIn(tier: 'basic' | 'premium' = 'premium') {
  mockedAuth.mockReturnValue(makeAuth({ profile: makeProfile({ tier }) }) as never);
}

beforeEach(() => {
  signedIn();
  listSessions.mockResolvedValue({ data: [], error: null });
  listPlans.mockResolvedValue({ data: [], error: null });
});

describe('ReviewTimeframe', () => {
  it('loads the current annual window and shows all five current aggregates', async () => {
    const now = new Date();
    listSessions.mockResolvedValue({
      data: [makeSession({ performed_at: now.toISOString(), tei: 12 })],
      error: null,
    });
    listPlans.mockResolvedValue({
      data: [makePlan({ planned_for: dayKey(now), tei: 12 })],
      error: null,
    });

    renderMain(<ReviewTimeframe />);
    await waitFor(() => expect(listSessions).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('WEEKLY')).toBeTruthy());

    expect(screen.getByText('MONTHLY')).toBeTruthy();
    expect(screen.getByText('QUARTERLY')).toBeTruthy();
    expect(screen.getByText('SEMI-ANNUAL')).toBeTruthy();
    expect(screen.getByText('ANNUAL')).toBeTruthy();
    expect(listPlans).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-01-01$/), expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
    expect(screen.getAllByText('12').length).toBeGreaterThan(0);
  });

  it('sends a non-Premium account home', async () => {
    signedIn('basic');
    renderMain(<ReviewTimeframe />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/home'));
  });
});
