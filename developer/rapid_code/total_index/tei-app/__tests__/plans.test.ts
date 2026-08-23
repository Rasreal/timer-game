import { createQueryMock, type QueryMock } from './helpers/supabaseMock';

const mockQ: QueryMock = createQueryMock();

jest.mock('../src/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) =>
      (mockQ.from as unknown as (...a: unknown[]) => unknown)(...args),
  },
}));

import {
  planDayKey,
  savePlan,
  listPlansBetween,
  clearPlan,
  type PlanRow,
} from '../src/lib/plans';

const PLAN: PlanRow = {
  id: 'plan-1',
  user_id: 'user-1',
  planned_for: '2026-04-27',
  tei: 55,
  calculator: 'standard',
  sets: 3,
  rest_seconds: 60,
  exertion_percent: 80,
  cardio_minutes: 20,
  breakdowns: null,
  exercises: null,
  circuits: null,
  yoga_minutes: null,
  created_at: '2026-04-20T10:00:00.000Z',
  updated_at: '2026-04-20T10:00:00.000Z',
};

beforeEach(() => {
  mockQ.reset();
});

describe('planDayKey', () => {
  it('formats a plain date as YYYY-MM-DD', () => {
    expect(planDayKey(new Date(2026, 3, 27, 10, 0, 0))).toBe('2026-04-27');
  });

  it('zero-pads single-digit months and days', () => {
    expect(planDayKey(new Date(2026, 0, 1, 10, 0, 0))).toBe('2026-01-01');
    expect(planDayKey(new Date(2026, 8, 9, 10, 0, 0))).toBe('2026-09-09');
    expect(planDayKey(new Date(2026, 11, 5, 10, 0, 0))).toBe('2026-12-05');
  });

  it('does not zero-pad a two-digit month or day', () => {
    expect(planDayKey(new Date(2026, 9, 10, 10, 0, 0))).toBe('2026-10-10');
    expect(planDayKey(new Date(2026, 11, 31, 10, 0, 0))).toBe('2026-12-31');
  });

  // The whole point of hand-rolling this instead of toISOString(): a late
  // local evening in a negative-offset zone would roll forward a day in UTC.
  it('does not shift across a local-midnight boundary at 23:30', () => {
    const late = new Date(2026, 3, 27, 23, 30, 0);
    expect(planDayKey(late)).toBe('2026-04-27');
    expect(late.getDate()).toBe(27);
  });

  it('does not shift backwards at 00:30 local', () => {
    const early = new Date(2026, 3, 27, 0, 30, 0);
    expect(planDayKey(early)).toBe('2026-04-27');
  });

  it('agrees with the local calendar at 23:59:59 on New Year’s Eve', () => {
    expect(planDayKey(new Date(2026, 11, 31, 23, 59, 59))).toBe('2026-12-31');
  });

  it('tracks the local day, not the UTC day, for every hour of a day', () => {
    for (let h = 0; h < 24; h++) {
      const d = new Date(2026, 5, 15, h, 30, 0);
      expect(planDayKey(d)).toBe('2026-06-15');
    }
  });
});

describe('savePlan', () => {
  it('upserts into the "plans" table', async () => {
    mockQ.setResult({ data: PLAN, error: null });

    await savePlan({ userId: 'user-1', plannedFor: '2026-04-27', tei: 55 });

    expect(mockQ.from).toHaveBeenCalledTimes(1);
    expect(mockQ.from).toHaveBeenCalledWith('plans');
    expect(mockQ.upsert).toHaveBeenCalledTimes(1);
    expect(mockQ.insert).not.toHaveBeenCalled();
  });

  it('nulls unsupplied optionals and defaults calculator to "standard"', async () => {
    mockQ.setResult({ data: PLAN, error: null });

    await savePlan({ userId: 'user-1', plannedFor: '2026-04-27', tei: 55 });

    expect(mockQ.upsert.mock.calls[0][0]).toEqual({
      user_id: 'user-1',
      planned_for: '2026-04-27',
      tei: 55,
      calculator: 'standard',
      sets: null,
      rest_seconds: null,
      exertion_percent: null,
      cardio_minutes: null,
      breakdowns: null,
      exercises: null,
      circuits: null,
      yoga_minutes: null,
    });
  });

  it('passes onConflict on the (user_id, planned_for) pair', async () => {
    mockQ.setResult({ data: PLAN, error: null });

    await savePlan({ userId: 'user-1', plannedFor: '2026-04-27', tei: 55 });

    expect(mockQ.upsert.mock.calls[0][1]).toEqual({
      onConflict: 'user_id,planned_for',
    });
  });

  it('maps every camelCase arg onto its snake_case column', async () => {
    mockQ.setResult({ data: PLAN, error: null });

    await savePlan({
      userId: 'u2',
      plannedFor: '2026-05-02',
      tei: 12.25,
      calculator: 'circuit',
      sets: 5,
      restSeconds: 45,
      exertionPercent: 65,
      cardioMinutes: 18,
      breakdowns: 1,
      exercises: 8,
      circuits: 4,
      yogaMinutes: 30,
    });

    expect(mockQ.upsert.mock.calls[0][0]).toEqual({
      user_id: 'u2',
      planned_for: '2026-05-02',
      tei: 12.25,
      calculator: 'circuit',
      sets: 5,
      rest_seconds: 45,
      exertion_percent: 65,
      cardio_minutes: 18,
      breakdowns: 1,
      exercises: 8,
      circuits: 4,
      yoga_minutes: 30,
    });
  });

  it('preserves zeros rather than nulling them', async () => {
    mockQ.setResult({ data: PLAN, error: null });

    await savePlan({
      userId: 'u3',
      plannedFor: '2026-05-02',
      tei: 0,
      sets: 0,
      cardioMinutes: 0,
    });

    const payload = mockQ.upsert.mock.calls[0][0];
    expect(payload.tei).toBe(0);
    expect(payload.sets).toBe(0);
    expect(payload.cardio_minutes).toBe(0);
  });

  it('chains upsert -> select -> single', async () => {
    mockQ.setResult({ data: PLAN, error: null });

    await savePlan({ userId: 'user-1', plannedFor: '2026-04-27', tei: 55 });

    expect(mockQ.calls).toEqual(['from', 'upsert', 'select', 'single']);
  });

  it('returns the saved row on success', async () => {
    mockQ.setResult({ data: PLAN, error: null });

    const res = await savePlan({
      userId: 'user-1',
      plannedFor: '2026-04-27',
      tei: 55,
    });

    expect(res).toEqual({ data: PLAN, error: null });
  });

  it('returns null data and error.message as a string on failure', async () => {
    mockQ.setResult({ data: null, error: { message: 'duplicate key' } });

    const res = await savePlan({
      userId: 'user-1',
      plannedFor: '2026-04-27',
      tei: 55,
    });

    expect(res.data).toBeNull();
    expect(typeof res.error).toBe('string');
    expect(res.error).toBe('duplicate key');
  });
});

describe('listPlansBetween', () => {
  it('uses a half-open gte/lt day window ordered oldest first', async () => {
    mockQ.setResult({ data: [PLAN], error: null });

    const res = await listPlansBetween('2026-04-01', '2026-05-01');

    expect(mockQ.from).toHaveBeenCalledWith('plans');
    expect(mockQ.select).toHaveBeenCalledWith('*');
    expect(mockQ.gte).toHaveBeenCalledWith('planned_for', '2026-04-01');
    expect(mockQ.lt).toHaveBeenCalledWith('planned_for', '2026-05-01');
    expect(mockQ.order).toHaveBeenCalledWith('planned_for', { ascending: true });
    expect(mockQ.calls).toEqual(['from', 'select', 'gte', 'lt', 'order']);
    expect(res).toEqual({ data: [PLAN], error: null });
  });

  it('returns [] when data is null', async () => {
    mockQ.setResult({ data: null, error: null });

    const res = await listPlansBetween('2026-04-01', '2026-05-01');

    expect(res.data).toEqual([]);
    expect(res.error).toBeNull();
  });

  it('returns [] plus the message on error', async () => {
    mockQ.setResult({ data: null, error: { message: 'bad range' } });

    const res = await listPlansBetween('2026-04-01', '2026-05-01');

    expect(res.data).toEqual([]);
    expect(typeof res.error).toBe('string');
    expect(res.error).toBe('bad range');
  });
});

describe('clearPlan', () => {
  it('deletes the row matching user_id and planned_for', async () => {
    mockQ.setResult({ data: null, error: null });

    const res = await clearPlan('user-1', '2026-04-27');

    expect(mockQ.from).toHaveBeenCalledWith('plans');
    expect(mockQ.delete).toHaveBeenCalledTimes(1);
    expect(mockQ.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(mockQ.eq).toHaveBeenCalledWith('planned_for', '2026-04-27');
    expect(mockQ.calls).toEqual(['from', 'delete', 'eq', 'eq']);
    expect(res).toEqual({ error: null });
  });

  // The delete is scoped explicitly rather than leaning on row-level security
  // alone: savePlan writes user_id, so the matching delete filters on it too.
  it('scopes the delete by user_id as well as the day', async () => {
    mockQ.setResult({ data: null, error: null });

    await clearPlan('user-1', '2026-04-27');

    expect(mockQ.eq).toHaveBeenCalledTimes(2);
    expect(mockQ.eq.mock.calls[0]).toEqual(['user_id', 'user-1']);
    expect(mockQ.eq.mock.calls[1]).toEqual(['planned_for', '2026-04-27']);
  });

  it('returns error.message as a string on failure', async () => {
    mockQ.setResult({ data: null, error: { message: 'delete failed' } });

    const res = await clearPlan('user-1', '2026-04-27');

    expect(typeof res.error).toBe('string');
    expect(res.error).toBe('delete failed');
  });
});

describe('re-exports', () => {
  it('re-exports the grading helpers from tei.ts', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const plans = require('../src/lib/plans');
    expect(typeof plans.gradeAgainstPlan).toBe('function');
    expect(plans.GRADE_COLORS).toBeDefined();
  });
});
