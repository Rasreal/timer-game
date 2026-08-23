import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { router } from 'expo-router';
import Review from '../../app/review';
import { useAuth } from '../../src/auth';
import * as sessions from '../../src/lib/sessions';
import * as plans from '../../src/lib/plans';
import { GRADE_COLORS, gradeAgainstPlan } from '../../src/lib/tei';
import { colors } from '../../src/theme';
import {
  dayKey,
  makeAuth,
  makePlan,
  makeProfile,
  makeSession,
  renderMain,
} from '../helpers/mainRender';

jest.mock('../../src/lib/supabase');
jest.mock('../../src/lib/sessions');
// requireActual keeps planDayKey real — review.tsx uses it to key the plan
// lookup, and a bare auto-mock would return undefined for every day.
jest.mock('../../src/lib/plans', () => ({
  ...jest.requireActual('../../src/lib/plans'),
  listPlansBetween: jest.fn(),
  savePlan: jest.fn(),
  clearPlan: jest.fn(),
}));
jest.mock('../../src/auth');

const mockedAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const listBetween = sessions.listSessionsBetween as jest.MockedFunction<
  typeof sessions.listSessionsBetween
>;
const listPlans = plans.listPlansBetween as jest.MockedFunction<
  typeof plans.listPlansBetween
>;

function signedIn(over: Record<string, unknown> = {}) {
  mockedAuth.mockReturnValue(
    makeAuth({ profile: makeProfile({ tier: 'basic' }), ...over }) as never,
  );
}

/** A date inside the currently-shown month, safely away from the edges. */
function dayInThisMonth(day: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), day, 12, 0, 0);
}

function flatten(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>(
      (acc, s) => ({ ...acc, ...flatten(s) }),
      {},
    );
  }
  return (style as Record<string, unknown>) ?? {};
}

/**
 * The day-circle score <Text>s. Day numbers carry the same digits, so they are
 * told apart by their style: scores are bold 19pt in colors.text, day numbers
 * are 15pt.
 */
function scoreNodes() {
  return screen.UNSAFE_getAllByType(Text).filter((n) => {
    const st = flatten(n.props.style);
    return st.fontSize === 19 && GRADE_VALUES.includes(st.color as string);
  });
}

/** Score <Text>s carrying a plan-grade colour. */
function gradedNodes() {
  return scoreNodes();
}

const GRADE_VALUES: string[] = Object.values(GRADE_COLORS);

function dayScores(): string[] {
  return scoreNodes().map((n) => String(n.props.children));
}

/** The big green number inside the footer's week-total ring. */
function footerTotal(): string {
  const node = screen.UNSAFE_getAllByType(Text).find((n) => {
    const st = flatten(n.props.style);
    return st.fontSize === 34 && st.color === colors.green;
  });
  return String(node?.props.children);
}

async function renderReview() {
  const view = renderMain(<Review />);
  await waitFor(() => expect(listBetween).toHaveBeenCalled());
  await waitFor(() => expect(listPlans).toHaveBeenCalled());
  await act(async () => {});
  return view;
}

beforeEach(() => {
  listBetween.mockResolvedValue({ data: [], error: null });
  listPlans.mockResolvedValue({ data: [], error: null });
  signedIn();
});

describe('Review', () => {
  it('renders the header chrome and the weekday row', async () => {
    await renderReview();

    expect(screen.getByText('TEI Review - Month')).toBeTruthy();
    expect(screen.getByLabelText('Previous month')).toBeTruthy();
    expect(screen.getByLabelText('Next month')).toBeTruthy();
    // S M T W T F S — 'S' and 'T' each appear twice.
    expect(screen.getAllByText('S')).toHaveLength(2);
    expect(screen.getAllByText('T')).toHaveLength(2);
    expect(screen.getByText('M')).toBeTruthy();
    expect(screen.getByText('W')).toBeTruthy();
    expect(screen.getByText('F')).toBeTruthy();
  });

  it('shows the current month and year in the header', async () => {
    await renderReview();
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'long' });
    // The month label is one <Text> holding the month plus a tinted year.
    expect(screen.getByText(new RegExp(`^${month}`))).toBeTruthy();
    expect(screen.getAllByText(String(now.getFullYear())).length).toBeGreaterThan(0);
  });

  it('queries the visible grid via listSessionsBetween with an ISO half-open range', async () => {
    await renderReview();

    const [from, to] = listBetween.mock.calls[0];
    expect(from).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(to).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(new Date(to).getTime()).toBeGreaterThan(new Date(from).getTime());
  });

  describe('with fixture sessions', () => {
    it("renders each day's rounded total in its circle", async () => {
      listBetween.mockResolvedValue({
        data: [
          makeSession({ id: 's1', performed_at: dayInThisMonth(5).toISOString(), tei: 12 }),
          makeSession({ id: 's2', performed_at: dayInThisMonth(9).toISOString(), tei: 18.4 }),
        ],
        error: null,
      });
      await renderReview();

      // Day numbers use the same digits, so read the week labels, which the
      // screen builds from the same byDay totals.
      expect(dayScores()).toEqual(expect.arrayContaining(['12', '18']));
      // 18.4 is rounded for display.
      expect(screen.queryByText('18.4')).toBeNull();
    });

    it('sums two sessions falling on the same day', async () => {
      const day = dayInThisMonth(7);
      listBetween.mockResolvedValue({
        data: [
          makeSession({ id: 's1', performed_at: day.toISOString(), tei: 10 }),
          makeSession({ id: 's2', performed_at: day.toISOString(), tei: 5 }),
        ],
        error: null,
      });
      await renderReview();

      expect(dayScores()).toContain('15');
    });

    it('puts the week total, rounded, in the footer ring', async () => {
      const day = dayInThisMonth(15);
      listBetween.mockResolvedValue({
        data: [makeSession({ performed_at: day.toISOString(), tei: 21 })],
        error: null,
      });
      await renderReview();

      // Select the week containing that day, then read the ring.
      const weekLabel = new RegExp(
        `Week of .*, total \\d+ TEI`,
      );
      const weeks = screen.getAllByLabelText(weekLabel);
      const withTotal = weeks.find((w) =>
        /total 21 TEI/.test(String(w.props.accessibilityLabel)),
      );
      expect(withTotal).toBeTruthy();

      fireEvent.press(withTotal!);
      expect(footerTotal()).toBe('21');
      expect(screen.getByText('TEI')).toBeTruthy();
    });

    it('formats the week-of date as "Month D, YYYY" in the row label', async () => {
      await renderReview();
      const weeks = screen.getAllByLabelText(/^Week of /);
      expect(weeks.length).toBeGreaterThan(0);
      expect(String(weeks[0].props.accessibilityLabel)).toMatch(
        /^Week of [A-Z][a-z]+ \d{1,2}, \d{4}, total \d+ TEI$/,
      );
    });
  });

  describe('empty state', () => {
    it('marks past in-month days with X when there are no sessions', async () => {
      await renderReview();
      // Today is at least the 1st, so at least one past/present day exists.
      expect(screen.getAllByText('X').length).toBeGreaterThan(0);
    });

    it('shows a zero week total in the footer ring', async () => {
      await renderReview();
      expect(footerTotal()).toBe('0');
    });

    it('renders no day scores at all, in the DOM or in the week labels', async () => {
      await renderReview();
      expect(dayScores()).toEqual([]);
      await renderReview();
      for (const w of screen.getAllByLabelText(/^Week of /)) {
        expect(String(w.props.accessibilityLabel)).toMatch(/total 0 TEI$/);
      }
    });
  });

  it('surfaces a load error in the footer', async () => {
    listBetween.mockResolvedValue({ data: [], error: 'network down' });
    await renderReview();
    expect(screen.getByText('network down')).toBeTruthy();
  });

  describe('month navigation', () => {
    it('the previous arrow re-queries an earlier range', async () => {
      await renderReview();
      const before = listBetween.mock.calls.length;

      await act(async () => {
        fireEvent.press(screen.getByLabelText('Previous month'));
      });

      expect(listBetween.mock.calls.length).toBeGreaterThan(before);
      const first = listBetween.mock.calls[0][0];
      const latest = listBetween.mock.calls.at(-1)![0];
      expect(new Date(latest).getTime()).toBeLessThan(new Date(first).getTime());
    });

    it('the next arrow re-queries a later range', async () => {
      await renderReview();
      const first = listBetween.mock.calls[0][0];

      await act(async () => {
        fireEvent.press(screen.getByLabelText('Next month'));
      });

      const latest = listBetween.mock.calls.at(-1)![0];
      expect(new Date(latest).getTime()).toBeGreaterThan(new Date(first).getTime());
    });
  });

  describe('tier gate', () => {
    it('bounces an Elemental user back to /home', async () => {
      signedIn({ profile: makeProfile({ tier: 'elemental' }) });
      await renderReview();
      expect(router.replace).toHaveBeenCalledWith('/home');
    });

    it.each(['basic', 'premium'] as const)('lets a %s user stay', async (tier) => {
      signedIn({ profile: makeProfile({ tier }) });
      await renderReview();
      expect(router.replace).not.toHaveBeenCalledWith('/home');
    });

    it('does not bounce while the profile is still loading', async () => {
      signedIn({ profile: null });
      await renderReview();
      expect(router.replace).not.toHaveBeenCalled();
    });

    // SUSPECTED BUG: the Elemental redirect fires from an effect, but the
    // screen still renders the full calendar (and still issues the
    // listSessionsBetween query) on the way out rather than short-circuiting
    // the render as app/_layout.tsx's AuthGate does for signed-out users.
    it('SUSPECTED BUG: Elemental still renders the calendar and still queries sessions', async () => {
      signedIn({ profile: makeProfile({ tier: 'elemental' }) });
      await renderReview();

      expect(listBetween).toHaveBeenCalled();
      expect(screen.getByText('TEI Review - Month')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('the back arrow replaces to /home', async () => {
      await renderReview();
      fireEvent.press(screen.getByLabelText('Back'));
      expect(router.replace).toHaveBeenCalledWith('/home');
    });

    it('"See Ideal Ranges of TEI" pushes /ranges', async () => {
      await renderReview();
      fireEvent.press(screen.getByText('See Ideal Ranges of TEI'));
      expect(router.push).toHaveBeenCalledWith('/ranges');
    });
  });

  describe('plan grading', () => {
    // Reference behaviour of the helper the brief expects Review to use.
    it.each([
      [15, 10, 'over'],
      [11, 10, 'on'],
      [10, 10, 'on'],
      [9, 10, 'on'],
      [8, 10, 'close'],
      [7, 10, 'close'],
      [5, 10, 'under'],
      [10, null, 'none'],
      [10, 0, 'none'],
    ] as const)('gradeAgainstPlan(%s, %s) === %s', (actual, planned, grade) => {
      expect(gradeAgainstPlan(actual, planned)).toBe(grade);
      expect(GRADE_COLORS[grade]).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('loads the plans for the visible grid alongside the sessions', async () => {
      await renderReview();
      expect(listPlans).toHaveBeenCalled();
      const [from, to] = listPlans.mock.calls[0];
      // Half-open day range, in planDayKey (YYYY-MM-DD) form.
      expect(from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(from < to).toBe(true);
    });

    // Each logged score is painted by gradeAgainstPlan(actual, planned) via
    // GRADE_COLORS — the workbook's colour coding.
    it.each([
      [30, 10, 'over'],
      [10, 10, 'on'],
      [8, 10, 'close'],
      [4, 10, 'under'],
    ] as const)(
      'paints a logged %s against a planned %s as %s',
      async (actual, planned, grade) => {
        const day = dayInThisMonth(11);
        listBetween.mockResolvedValue({
          data: [makeSession({ performed_at: day.toISOString(), tei: actual })],
          error: null,
        });
        listPlans.mockResolvedValue({
          data: [makePlan({ planned_for: dayKey(day), tei: planned })],
          error: null,
        });
        await renderReview();

        const score = gradedNodes().find(
          (n) => String(n.props.children) === String(actual),
        );
        expect(score).toBeTruthy();
        expect(flatten(score!.props.style).color).toBe(GRADE_COLORS[grade]);
      },
    );

    it('paints an unplanned day with the "none" grade colour', async () => {
      const day = dayInThisMonth(11);
      listBetween.mockResolvedValue({
        data: [makeSession({ performed_at: day.toISOString(), tei: 30 })],
        error: null,
      });
      listPlans.mockResolvedValue({ data: [], error: null });
      await renderReview();

      const score = gradedNodes().find((n) => String(n.props.children) === '30');
      expect(score).toBeTruthy();
      expect(flatten(score!.props.style).color).toBe(GRADE_COLORS.none);
    });

    it('still paints the scores when the plan query fails', async () => {
      const day = dayInThisMonth(11);
      listBetween.mockResolvedValue({
        data: [makeSession({ performed_at: day.toISOString(), tei: 30 })],
        error: null,
      });
      listPlans.mockResolvedValue({ data: [], error: 'plans unavailable' });
      await renderReview();

      const score = gradedNodes().find((n) => String(n.props.children) === '30');
      expect(score).toBeTruthy();
      expect(flatten(score!.props.style).color).toBe(GRADE_COLORS.none);
    });
  });
});
