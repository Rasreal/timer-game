import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import ReviewWeek from '../../app/review-week';
import ReviewSnapshot from '../../app/review-snapshot';
import { useAuth } from '../../src/auth';
import * as sessions from '../../src/lib/sessions';
import { previousFullWeekStart } from '../../src/lib/review';
import { makeAuth, makeProfile, makeSession, renderMain } from '../helpers/mainRender';

jest.mock('../../src/lib/supabase');
jest.mock('../../src/lib/sessions');
jest.mock('../../src/auth');

const mockedAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const listBetween = sessions.listSessionsBetween as jest.MockedFunction<
  typeof sessions.listSessionsBetween
>;

/** A Sunday well in the past, so every day of its week is a past day. */
const SUNDAY = new Date(2026, 4, 3); // May 3, 2026
const at = (dayOffset: number, hour: number) =>
  new Date(2026, 4, 3 + dayOffset, hour, 0, 0).toISOString();

beforeEach(() => {
  mockedAuth.mockReturnValue(makeAuth({ profile: makeProfile({ tier: 'basic' }) }) as never);
  (useLocalSearchParams as jest.Mock).mockReturnValue({ start: '2026-05-03' });
  (router as unknown as { canGoBack: jest.Mock }).canGoBack = jest.fn(() => true);
  listBetween.mockResolvedValue({ data: [], error: null });
});

async function renderWeek() {
  renderMain(<ReviewWeek />);
  await waitFor(() => expect(listBetween).toHaveBeenCalled());
  await act(async () => {});
}

describe('TEI - 7 Days in Review', () => {
  it('queries exactly the seven days from the start Sunday', async () => {
    await renderWeek();

    const [from, to] = listBetween.mock.calls[0];
    expect(new Date(from).getTime()).toBe(SUNDAY.getTime());
    expect(new Date(to).getTime()).toBe(new Date(2026, 4, 10).getTime());
    expect(screen.getByText('May 3, 2026')).toBeTruthy();
  });

  it('lists the seven days with OFF for past rest days', async () => {
    await renderWeek();

    for (let i = 1; i <= 7; i++) {
      expect(screen.getByText(`Day ${i}:`, { exact: false })).toBeTruthy();
    }
    expect(screen.getByText(/SUNDAY - May 3, 2026/)).toBeTruthy();
    expect(screen.getAllByText('OFF')).toHaveLength(7);
  });

  it("shows a single session's variables and TEI, and opens it for editing", async () => {
    listBetween.mockResolvedValue({
      data: [makeSession({ id: 's1', performed_at: at(1, 9), sets: 11, rest_seconds: 60, exertion_percent: 80, cardio_minutes: 41, tei: 14 })],
      error: null,
    });
    await renderWeek();

    expect(screen.getByText('11')).toBeTruthy();
    expect(screen.getByText('41')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Day 2, 14 TEI. Edit this session.'));
    expect(router.push).toHaveBeenCalledWith('/calculator');
  });

  it('labels a Breakdown day with its own variables', async () => {
    listBetween.mockResolvedValue({
      data: [makeSession({ calculator: 'breakdown', breakdowns: 3, performed_at: at(3, 9), tei: 23 })],
      error: null,
    });
    await renderWeek();

    expect(screen.getByText('Breakdowns')).toBeTruthy();
  });

  it('a day with several sessions shows Multiple Entries and the day total', async () => {
    listBetween.mockResolvedValue({
      data: [
        makeSession({ id: 'a', performed_at: at(2, 7), tei: 16 }),
        makeSession({ id: 'b', performed_at: at(2, 17), sets: 0, rest_seconds: 0, exertion_percent: 0, cardio_minutes: 22, tei: 4 }),
      ],
      error: null,
    });
    await renderWeek();

    expect(screen.getByText('Multiple Entries →')).toBeTruthy();
    expect(screen.getByLabelText('Day 3, 20 TEI from 2 sessions. See sessions.')).toBeTruthy();

    fireEvent.press(screen.getByText('Multiple Entries →'));
    expect(screen.getByText('2 Sessions')).toBeTruthy();
    expect(screen.getByText('Tuesday - May 5, 2026')).toBeTruthy();
    // Five slots as drawn, the unused three dimmed.
    expect(screen.getByLabelText('Session 3, empty')).toBeTruthy();
    expect(screen.getByLabelText('Session 5, empty')).toBeTruthy();
    expect(screen.getByLabelText("This day's total, 20 TEI")).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Session 1, 16 TEI. Edit this session.'));
    expect(router.push).toHaveBeenCalledWith('/calculator');
  });

  it('tapping the score next to Multiple Entries also slides up the sessions', async () => {
    listBetween.mockResolvedValue({
      data: [
        makeSession({ id: 'a', performed_at: at(2, 7), tei: 16 }),
        makeSession({ id: 'b', performed_at: at(2, 17), tei: 4 }),
      ],
      error: null,
    });
    await renderWeek();

    fireEvent.press(screen.getByLabelText('Day 3, 20 TEI from 2 sessions. See sessions.'));
    expect(screen.getByText('2 Sessions')).toBeTruthy();
  });

  it('totals the week and goes Back to YOUR Hub', async () => {
    listBetween.mockResolvedValue({
      data: [
        makeSession({ id: 'a', performed_at: at(0, 9), tei: 14 }),
        makeSession({ id: 'b', performed_at: at(4, 9), tei: 13 }),
      ],
      error: null,
    });
    await renderWeek();

    expect(screen.getByLabelText('Seven day total, 27 TEI')).toBeTruthy();
    fireEvent.press(screen.getByText('Back to YOUR Hub'));
    expect(router.replace).toHaveBeenCalledWith('/home');
  });

  it('starts on the Sunday even when handed a mid-week day', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ start: '2026-05-06' });
    await renderWeek();

    expect(new Date(listBetween.mock.calls[0][0]).getTime()).toBe(SUNDAY.getTime());
  });

  it('shows a load failure', async () => {
    listBetween.mockResolvedValue({ data: [], error: 'network down' });
    await renderWeek();
    expect(screen.getByText('network down')).toBeTruthy();
  });

  it('sends Elemental back to Home', async () => {
    mockedAuth.mockReturnValue(makeAuth({ profile: makeProfile({ tier: 'elemental' }) }) as never);
    renderMain(<ReviewWeek />);
    await act(async () => {});
    expect(router.replace).toHaveBeenCalledWith('/home');
    expect(listBetween).not.toHaveBeenCalled();
  });
});

describe('SNAPSHOT of previous full week', () => {
  it('reads the last finished Sunday-to-Saturday week and shows its total', async () => {
    const start = previousFullWeekStart();
    const day = (offset: number) =>
      new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset, 10).toISOString();
    listBetween.mockResolvedValue({
      data: [
        makeSession({ id: 'a', performed_at: day(1), tei: 18 }),
        makeSession({ id: 'b', performed_at: day(2), tei: 24 }),
        makeSession({ id: 'c', performed_at: day(2), tei: 3 }),
      ],
      error: null,
    });
    renderMain(<ReviewSnapshot />);
    await waitFor(() => expect(listBetween).toHaveBeenCalled());
    await act(async () => {});

    expect(new Date(listBetween.mock.calls[0][0]).getTime()).toBe(start.getTime());
    expect(screen.getByLabelText('Week total, 45 TEI')).toBeTruthy();
    // One bar per day with a session; days are summed.
    expect(screen.getByTestId('snapshot-bar-1')).toBeTruthy();
    expect(screen.getByLabelText(/, 27 TEI$/)).toBeTruthy();
    expect(screen.queryByTestId('snapshot-bar-0')).toBeNull();
  });

  it('sends Elemental back to Home', async () => {
    mockedAuth.mockReturnValue(makeAuth({ profile: makeProfile({ tier: 'elemental' }) }) as never);
    renderMain(<ReviewSnapshot />);
    await act(async () => {});
    expect(router.replace).toHaveBeenCalledWith('/home');
  });
});
