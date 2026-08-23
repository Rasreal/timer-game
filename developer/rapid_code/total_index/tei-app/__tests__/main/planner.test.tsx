import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Planner from '../../app/planner';
import { useAuth } from '../../src/auth';
import * as plans from '../../src/lib/plans';
import { dayKey, makeAuth, makeProfile, makePlan, renderMain } from '../helpers/mainRender';

jest.mock('../../src/lib/supabase');
jest.mock('../../src/lib/sessions');
jest.mock('../../src/lib/plans', () => ({
  ...jest.requireActual('../../src/lib/plans'),
  listPlansBetween: jest.fn(),
  savePlan: jest.fn(),
  clearPlan: jest.fn(),
}));
jest.mock('../../src/auth');

const mockedAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedParams = useLocalSearchParams as jest.MockedFunction<
  typeof useLocalSearchParams
>;
const listPlans = plans.listPlansBetween as jest.MockedFunction<
  typeof plans.listPlansBetween
>;
const savePlan = plans.savePlan as jest.MockedFunction<typeof plans.savePlan>;
const clearPlan = plans.clearPlan as jest.MockedFunction<typeof plans.clearPlan>;

const START = '2026-05-04';

function signedIn(over: Record<string, unknown> = {}) {
  mockedAuth.mockReturnValue(
    makeAuth({ profile: makeProfile({ tier: 'premium' }), ...over }) as never,
  );
}

function setCanGoBack(value: boolean) {
  (router as unknown as { canGoBack: jest.Mock }).canGoBack = jest.fn(() => value);
}

async function renderPlanner() {
  const view = renderMain(<Planner />);
  await waitFor(() => expect(listPlans).toHaveBeenCalled());
  await act(async () => {});
  return view;
}

/** The seven day keys the planner shows for START. */
const WEEK = Array.from({ length: 7 }, (_, i) =>
  dayKey(new Date(2026, 4, 4 + i)),
);

beforeEach(() => {
  mockedParams.mockReturnValue({ start: START } as never);
  listPlans.mockResolvedValue({ data: [], error: null });
  savePlan.mockResolvedValue({ data: makePlan(), error: null });
  clearPlan.mockResolvedValue({ error: null });
  setCanGoBack(true);
  signedIn();
});

describe('Planner (7-day)', () => {
  it('renders the heading and the start date from the ?start= param', async () => {
    await renderPlanner();
    expect(screen.getByText('TEI - 7 Day Planner')).toBeTruthy();
    expect(screen.getByText('Start Date:')).toBeTruthy();
    expect(screen.getByText('May 4, 2026')).toBeTruthy();
  });

  it('falls back to today when ?start= is missing or malformed', async () => {
    mockedParams.mockReturnValue({} as never);
    await renderPlanner();
    const today = new Date();
    const expected = `${today.toLocaleString('en-US', { month: 'long' })} ${today.getDate()}, ${today.getFullYear()}`;
    expect(screen.getByText(expected)).toBeTruthy();
  });

  it('renders exactly seven day rows, Day 1..Day 7', async () => {
    await renderPlanner();
    for (let i = 1; i <= 7; i++) {
      expect(screen.getByText(new RegExp(`^Day ${i}:`))).toBeTruthy();
    }
    expect(screen.getAllByLabelText(/^Day \d,/)).toHaveLength(7);
  });

  it('queries listPlansBetween over the half-open seven-day window', async () => {
    await renderPlanner();
    expect(listPlans).toHaveBeenCalledWith('2026-05-04', '2026-05-11');
  });

  describe('a day with no plan', () => {
    it('renders the unplanned "-----" / "•••" empty state', async () => {
      await renderPlanner();
      expect(screen.getAllByText('-----')).toHaveLength(7);
      expect(screen.getAllByText('•••')).toHaveLength(7);
    });

    it('renders X for each of the four unplanned variables', async () => {
      await renderPlanner();
      // 7 rows x 4 variable cells.
      expect(screen.getAllByText('X')).toHaveLength(28);
    });

    it('labels the ring "not planned. Plan this day."', async () => {
      await renderPlanner();
      expect(screen.getAllByLabelText(/not planned\. Plan this day\.$/)).toHaveLength(7);
    });

    it('leaves the seven-day total blank when nothing is planned', async () => {
      await renderPlanner();
      expect(screen.getByLabelText('Seven day total, 0 TEI')).toBeTruthy();
    });
  });

  describe('with fixture plans', () => {
    beforeEach(() => {
      listPlans.mockResolvedValue({
        data: [
          makePlan({
            id: 'p1',
            planned_for: WEEK[0],
            tei: 12,
            sets: 8,
            rest_seconds: 45,
            exertion_percent: 70,
            cardio_minutes: 15,
          }),
          makePlan({
            id: 'p2',
            planned_for: WEEK[3],
            tei: 9.5,
            sets: 1,
            rest_seconds: 2,
            exertion_percent: 3,
            cardio_minutes: 4,
          }),
        ],
        error: null,
      });
    });

    it("shows each planned day's TEI and short date", async () => {
      await renderPlanner();
      // Read the TEI off the ring labels: the variable cells reuse the digits.
      expect(screen.getByLabelText(/^Day 1, May 4, 2026, 12 TEI\./)).toBeTruthy();
      // Non-integers keep one decimal in the ring.
      expect(screen.getByText('9.5')).toBeTruthy();
      expect(screen.getByText('May 4')).toBeTruthy();
      expect(screen.getByText('May 7')).toBeTruthy();
    });

    it("shows the planned day's four variables", async () => {
      await renderPlanner();
      expect(screen.getByText('8')).toBeTruthy();
      expect(screen.getByText('45')).toBeTruthy();
      expect(screen.getByText('70')).toBeTruthy();
      expect(screen.getByText('15')).toBeTruthy();
    });

    it('sums the seven-day total', async () => {
      await renderPlanner();
      expect(screen.getByLabelText('Seven day total, 21.5 TEI')).toBeTruthy();
    });

    it('labels a planned ring "Change this plan."', async () => {
      await renderPlanner();
      expect(screen.getAllByLabelText(/Change this plan\.$/)).toHaveLength(2);
    });

    it('still shows the empty state on the five unplanned days', async () => {
      await renderPlanner();
      expect(screen.getAllByText('-----')).toHaveLength(5);
    });
  });

  describe('saving', () => {
    beforeEach(() => {
      listPlans.mockResolvedValue({
        data: [
          makePlan({
            id: 'p1',
            planned_for: WEEK[1],
            tei: 14,
            calculator: 'cardio',
            sets: 5,
            rest_seconds: 60,
            exertion_percent: 80,
            cardio_minutes: 30,
            breakdowns: 2,
            exercises: 3,
            circuits: 4,
            yoga_minutes: 5,
          }),
        ],
        error: null,
      });
    });

    it('calls savePlan once per planned day, with the full row mapped to camelCase', async () => {
      await renderPlanner();
      await act(async () => {
        fireEvent.press(screen.getByText('Save this PLAN'));
      });

      expect(savePlan).toHaveBeenCalledTimes(1);
      expect(savePlan).toHaveBeenCalledWith({
        userId: 'user-1',
        plannedFor: WEEK[1],
        tei: 14,
        calculator: 'cardio',
        sets: 5,
        restSeconds: 60,
        exertionPercent: 80,
        cardioMinutes: 30,
        breakdowns: 2,
        exercises: 3,
        circuits: 4,
        yogaMinutes: 5,
      });
    });

    it('offers "plan another week" after a successful save', async () => {
      await renderPlanner();
      await act(async () => {
        fireEvent.press(screen.getByText('Save this PLAN'));
      });
      expect(screen.getByText('Plan saved')).toBeTruthy();
      expect(screen.getByText('Would you like to plan another week?')).toBeTruthy();
    });

    it('YES advances the window by seven days and refetches', async () => {
      await renderPlanner();
      await act(async () => {
        fireEvent.press(screen.getByText('Save this PLAN'));
      });
      await act(async () => {
        fireEvent.press(screen.getByLabelText('Yes, plan the next seven days'));
      });

      expect(listPlans).toHaveBeenLastCalledWith('2026-05-11', '2026-05-18');
      expect(screen.getByText('May 11, 2026')).toBeTruthy();
    });

    it('NO replaces to /home', async () => {
      await renderPlanner();
      await act(async () => {
        fireEvent.press(screen.getByText('Save this PLAN'));
      });
      fireEvent.press(screen.getByLabelText('No, return home'));
      expect(router.replace).toHaveBeenCalledWith('/home');
    });

    it('toasts and stops when savePlan fails', async () => {
      savePlan.mockResolvedValue({ data: null, error: 'row rejected' });
      await renderPlanner();
      await act(async () => {
        fireEvent.press(screen.getByText('Save this PLAN'));
      });

      expect(screen.getByTestId('toast')).toHaveTextContent('row rejected');
      expect(screen.queryByText('Plan saved')).toBeNull();
    });

    it('toasts and skips savePlan when nothing is planned', async () => {
      listPlans.mockResolvedValue({ data: [], error: null });
      await renderPlanner();
      await act(async () => {
        fireEvent.press(screen.getByText('Save this PLAN'));
      });

      expect(savePlan).not.toHaveBeenCalled();
      expect(screen.getByTestId('toast')).toHaveTextContent(
        'Nothing planned yet — tap a day to plan it.',
      );
    });

    it('does nothing without a session', async () => {
      signedIn({ session: null });
      await renderPlanner();
      await act(async () => {
        fireEvent.press(screen.getByText('Save this PLAN'));
      });
      expect(savePlan).not.toHaveBeenCalled();
    });

    // The screen has no inputs of its own, so Save commits the week exactly as
    // it now stands — including any day cleared since the load. It is a
    // confirm-the-week step, not a no-op: the confirmation flow it opens is
    // what advances the planner to the next seven days.
    it('commits the week as it currently stands', async () => {
      await renderPlanner();
      await act(async () => {
        fireEvent.press(screen.getByText('Save this PLAN'));
      });

      const arg = savePlan.mock.calls[0][0];
      expect(arg.plannedFor).toBe(WEEK[1]);
      expect(arg.tei).toBe(14);
    });

    it('does not re-save a day that was cleared first', async () => {
      await renderPlanner();

      await act(async () => {
        fireEvent.press(screen.getByLabelText(/^Clear the plan for Day 2,/));
      });
      await act(async () => {
        fireEvent.press(screen.getByText('Save this PLAN'));
      });

      expect(clearPlan).toHaveBeenCalledWith('user-1', WEEK[1]);
      // The only planned day is gone, so there is nothing left to commit.
      expect(savePlan).not.toHaveBeenCalled();
      expect(screen.getByTestId('toast')).toHaveTextContent(
        'Nothing planned yet — tap a day to plan it.',
      );
    });
  });

  describe('clearing a planned day', () => {
    beforeEach(() => {
      listPlans.mockResolvedValue({
        data: [makePlan({ planned_for: WEEK[0], tei: 10 })],
        error: null,
      });
    });

    it('offers a CLEAR control only on a planned day', async () => {
      await renderPlanner();
      // One planned day of the seven, so exactly one CLEAR affordance.
      expect(screen.getAllByText('CLEAR')).toHaveLength(1);
      expect(screen.getByLabelText(/^Clear the plan for Day 1,/)).toBeTruthy();
    });

    it('calls clearPlan with the user id and the day, then drops the row', async () => {
      await renderPlanner();
      await act(async () => {
        fireEvent.press(screen.getByLabelText(/^Clear the plan for Day 1,/));
      });

      expect(clearPlan).toHaveBeenCalledWith('user-1', WEEK[0]);
      expect(screen.getByTestId('toast')).toHaveTextContent('Plan cleared.');
      // The day falls back to the unplanned state, so all seven now show it.
      expect(screen.getAllByText('-----')).toHaveLength(7);
      expect(screen.queryByText('CLEAR')).toBeNull();
    });

    it('keeps the row and toasts when the delete fails', async () => {
      clearPlan.mockResolvedValue({ error: 'delete rejected' });
      await renderPlanner();
      await act(async () => {
        fireEvent.press(screen.getByLabelText(/^Clear the plan for Day 1,/));
      });

      expect(screen.getByTestId('toast')).toHaveTextContent('delete rejected');
      expect(screen.getAllByText('CLEAR')).toHaveLength(1);
    });

    it('does nothing without a session', async () => {
      signedIn({ session: null });
      await renderPlanner();
      await act(async () => {
        fireEvent.press(screen.getByLabelText(/^Clear the plan for Day 1,/));
      });
      expect(clearPlan).not.toHaveBeenCalled();
    });
  });

  describe('day rings', () => {
    it('tapping a day pushes /session-type with that day as ?plan=', async () => {
      await renderPlanner();
      fireEvent.press(screen.getAllByLabelText(/^Day 3,/)[0]);
      expect(router.push).toHaveBeenCalledWith(`/session-type?plan=${WEEK[2]}`);
    });
  });

  // SUSPECTED BUG: the start-date row looks tappable (Pressable, its own
  // accessibility label, press opacity) but only toasts — the date picker was
  // never wired up, so the start date can only be changed by re-navigating.
  it('SUSPECTED BUG: the Start Date row is a dead button that only toasts', async () => {
    await renderPlanner();
    fireEvent.press(screen.getByLabelText('Start date, May 4, 2026'));

    expect(screen.getByTestId('toast')).toHaveTextContent(
      'Date picking is not wired up in the prototype.',
    );
    expect(screen.getByText('May 4, 2026')).toBeTruthy();
  });

  it('surfaces a load error', async () => {
    listPlans.mockResolvedValue({ data: [], error: 'plans unavailable' });
    await renderPlanner();
    expect(screen.getByText('plans unavailable')).toBeTruthy();
  });

  describe('tier gate', () => {
    it.each(['elemental', 'basic'] as const)('bounces a %s user to /home', async (tier) => {
      signedIn({ profile: makeProfile({ tier }) });
      await renderPlanner();
      expect(router.replace).toHaveBeenCalledWith('/home');
    });

    it('lets a Premium user stay', async () => {
      await renderPlanner();
      expect(router.replace).not.toHaveBeenCalledWith('/home');
    });

    it('does not bounce while the profile is still loading', async () => {
      signedIn({ profile: null });
      await renderPlanner();
      expect(router.replace).not.toHaveBeenCalled();
    });
  });

  describe('back navigation', () => {
    it('goes back when there is history', async () => {
      setCanGoBack(true);
      await renderPlanner();
      fireEvent.press(screen.getByLabelText('Back'));
      expect(router.back).toHaveBeenCalled();
    });

    it('replaces to /plan with no history', async () => {
      setCanGoBack(false);
      await renderPlanner();
      fireEvent.press(screen.getByLabelText('Back'));
      expect(router.replace).toHaveBeenCalledWith('/plan');
    });
  });
});
