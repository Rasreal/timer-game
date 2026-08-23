import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import Plan from '../../app/plan';
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
const listPlans = plans.listPlansBetween as jest.MockedFunction<
  typeof plans.listPlansBetween
>;

function signedIn(over: Record<string, unknown> = {}) {
  mockedAuth.mockReturnValue(
    makeAuth({ profile: makeProfile({ tier: 'premium' }), ...over }) as never,
  );
}

/** A future day inside the shown month, so it is plannable. */
function futureDayThisMonth(): Date {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12);
  // If tomorrow spills into next month, fall back to today (still plannable).
  return d.getMonth() === now.getMonth() ? d : now;
}

async function renderPlan() {
  const view = renderMain(<Plan />);
  await waitFor(() => expect(listPlans).toHaveBeenCalled());
  await act(async () => {});
  return view;
}

beforeEach(() => {
  listPlans.mockResolvedValue({ data: [], error: null });
  signedIn();
});

describe('Plan (month calendar)', () => {
  it('renders the header chrome and weekday row', async () => {
    await renderPlan();

    expect(screen.getByText('Plan TEI - Month')).toBeTruthy();
    expect(screen.getByLabelText('Previous month')).toBeTruthy();
    expect(screen.getByLabelText('Next month')).toBeTruthy();
    expect(screen.getAllByText('S')).toHaveLength(2);
    expect(screen.getByText('W')).toBeTruthy();
  });

  it('shows the current month in the header', async () => {
    await renderPlan();
    const month = new Date().toLocaleString('en-US', { month: 'long' });
    expect(screen.getByText(new RegExp(`^${month}`))).toBeTruthy();
  });

  it('renders day cells — one per calendar day, labelled by date', async () => {
    await renderPlan();
    const cells = screen.getAllByLabelText(
      /^[A-Z][a-z]+ \d{1,2}, \d{4}, (no TEI planned|in the past — cannot be planned|\d+ TEI planned)$/,
    );
    // Six weeks of seven days, or five when the trailing spill row is dropped.
    expect(cells.length === 35 || cells.length === 42).toBe(true);
  });

  it('queries listPlansBetween with YYYY-MM-DD day keys', async () => {
    await renderPlan();
    const [from, to] = listPlans.mock.calls[0];
    expect(from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(from < to).toBe(true);
  });

  describe('with fixture plans', () => {
    it("renders a planned day's rounded TEI in its label", async () => {
      const day = futureDayThisMonth();
      listPlans.mockResolvedValue({
        data: [makePlan({ planned_for: dayKey(day), tei: 17.6 })],
        error: null,
      });
      await renderPlan();

      expect(screen.getByLabelText(/, 18 TEI planned$/)).toBeTruthy();
    });

    it('sums two plan rows landing on the same day', async () => {
      const day = futureDayThisMonth();
      listPlans.mockResolvedValue({
        data: [
          makePlan({ id: 'p1', planned_for: dayKey(day), tei: 10 }),
          makePlan({ id: 'p2', planned_for: dayKey(day), tei: 4 }),
        ],
        error: null,
      });
      await renderPlan();

      expect(screen.getByLabelText(/, 14 TEI planned$/)).toBeTruthy();
    });

    it('hides the "nothing planned" empty state once a plan exists', async () => {
      listPlans.mockResolvedValue({
        data: [makePlan({ planned_for: dayKey(futureDayThisMonth()), tei: 9 })],
        error: null,
      });
      await renderPlan();

      expect(
        screen.queryByText(
          'Nothing planned this month yet — touch a day to design its Target TEI.',
        ),
      ).toBeNull();
    });
  });

  describe('empty state', () => {
    it('shows the "nothing planned this month" copy', async () => {
      await renderPlan();
      expect(
        screen.getByText(
          'Nothing planned this month yet — touch a day to design its Target TEI.',
        ),
      ).toBeTruthy();
    });

    it('labels every unplanned future day "no TEI planned"', async () => {
      await renderPlan();
      expect(screen.getAllByLabelText(/, no TEI planned$/).length).toBeGreaterThan(0);
    });

    it('shows a zero week total in the footer ring', async () => {
      await renderPlan();
      for (const w of screen.getAllByLabelText(/^Select week of /)) {
        expect(String(w.props.accessibilityLabel)).toMatch(/planned total 0 TEI$/);
      }
    });
  });

  it('marks past days as unplannable and disables them', async () => {
    await renderPlan();
    const now = new Date();
    if (now.getDate() > 1) {
      const past = screen.getAllByLabelText(/in the past — cannot be planned$/);
      expect(past.length).toBeGreaterThan(0);
      expect(past[0].props.accessibilityState?.disabled).toBe(true);
    }
  });

  it('surfaces a load error in the footer', async () => {
    listPlans.mockResolvedValue({ data: [], error: 'plans unavailable' });
    await renderPlan();
    expect(screen.getByText('plans unavailable')).toBeTruthy();
  });

  describe('the day-tap confirm sheet', () => {
    it('opens when a plannable day is tapped', async () => {
      await renderPlan();
      fireEvent.press(screen.getAllByLabelText(/, no TEI planned$/)[0]);
      expect(screen.getByText(/Would you like to plan Your TEI for/)).toBeTruthy();
      expect(screen.getByText('Plan My TEI')).toBeTruthy();
      expect(screen.getByText('See Week Total')).toBeTruthy();
    });

    it('"Plan My TEI" pushes /planner with the day as ?start=', async () => {
      await renderPlan();
      const cell = screen.getAllByLabelText(/, no TEI planned$/)[0];
      const label = String(cell.props.accessibilityLabel);
      fireEvent.press(cell);
      fireEvent.press(screen.getByText('Plan My TEI'));

      expect(router.push).toHaveBeenCalledWith(
        expect.stringMatching(/^\/planner\?start=\d{4}-\d{2}-\d{2}$/),
      );
      // The pushed key matches the tapped cell's date.
      const pushed = (router.push as jest.Mock).mock.calls[0][0] as string;
      const [, y, m, d] = pushed.match(/(\d{4})-(\d{2})-(\d{2})$/)!;
      expect(label).toContain(`${Number(d)}, ${y}`);
      expect(Number(m)).toBeGreaterThan(0);
    });

    it('the ✕ dismisses without navigating', async () => {
      await renderPlan();
      fireEvent.press(screen.getAllByLabelText(/, no TEI planned$/)[0]);
      fireEvent.press(screen.getByLabelText('Cancel'));

      expect(screen.queryByText('Plan My TEI')).toBeNull();
      expect(router.push).not.toHaveBeenCalled();
    });

    it('"See Week Total" selects that week instead of navigating', async () => {
      await renderPlan();
      fireEvent.press(screen.getAllByLabelText(/, no TEI planned$/)[0]);
      fireEvent.press(screen.getByText('See Week Total'));

      expect(router.push).not.toHaveBeenCalled();
      expect(screen.queryByText('See Week Total')).toBeNull();
    });

    // By design the month calendar is read-only: it is a navigation surface,
    // and a day circle here carries only a total, not the plan it came from.
    // Writing and clearing both live on app/planner.tsx, where a planned day
    // is shown in full alongside its CLEAR control.
    it('is read-only — it navigates rather than calling savePlan or clearPlan', async () => {
      await renderPlan();
      fireEvent.press(screen.getAllByLabelText(/, no TEI planned$/)[0]);
      fireEvent.press(screen.getByText('Plan My TEI'));

      expect(plans.savePlan).not.toHaveBeenCalled();
      expect(plans.clearPlan).not.toHaveBeenCalled();
    });
  });

  describe('month navigation', () => {
    it('the previous arrow re-queries an earlier range', async () => {
      await renderPlan();
      const first = listPlans.mock.calls[0][0];
      await act(async () => {
        fireEvent.press(screen.getByLabelText('Previous month'));
      });
      expect(listPlans.mock.calls.at(-1)![0] < first).toBe(true);
    });

    it('the next arrow re-queries a later range', async () => {
      await renderPlan();
      const first = listPlans.mock.calls[0][0];
      await act(async () => {
        fireEvent.press(screen.getByLabelText('Next month'));
      });
      expect(listPlans.mock.calls.at(-1)![0] > first).toBe(true);
    });
  });

  describe('tier gate', () => {
    it.each(['elemental', 'basic'] as const)('bounces a %s user to /home', async (tier) => {
      signedIn({ profile: makeProfile({ tier }) });
      await renderPlan();
      expect(router.replace).toHaveBeenCalledWith('/home');
    });

    it('lets a Premium user stay', async () => {
      await renderPlan();
      expect(router.replace).not.toHaveBeenCalledWith('/home');
    });

    it('does not bounce while the profile is still loading', async () => {
      signedIn({ profile: null });
      await renderPlan();
      expect(router.replace).not.toHaveBeenCalled();
    });

    // SUSPECTED BUG: same shape as review.tsx — the redirect is effect-driven,
    // so a Basic user still paints the whole planner calendar and still runs
    // the listPlansBetween query on the way out.
    it('SUSPECTED BUG: a Basic user still renders the calendar and still queries plans', async () => {
      signedIn({ profile: makeProfile({ tier: 'basic' }) });
      await renderPlan();

      expect(listPlans).toHaveBeenCalled();
      expect(screen.getByText('Plan TEI - Month')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('the back arrow replaces to /home', async () => {
      await renderPlan();
      fireEvent.press(screen.getByLabelText('Back'));
      expect(router.replace).toHaveBeenCalledWith('/home');
    });

    it('"See Effective Ranges of TEI" pushes /ranges', async () => {
      await renderPlan();
      fireEvent.press(screen.getByText('See Effective Ranges of TEI'));
      expect(router.push).toHaveBeenCalledWith('/ranges');
    });
  });
});
