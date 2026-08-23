import { createQueryMock, type QueryMock } from './helpers/supabaseMock';

const mockQ: QueryMock = createQueryMock();

jest.mock('../src/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) =>
      (mockQ.from as unknown as (...a: unknown[]) => unknown)(...args),
  },
}));

import {
  saveSession,
  listSessions,
  listSessionsBetween,
  latestSession,
} from '../src/lib/sessions';

const ROW = {
  id: 'row-1',
  user_id: 'user-1',
  performed_at: '2026-04-27T14:33:00.000Z',
  cardio_minutes: 30,
  tei: 42.5,
  calculator: 'standard',
  sets: 3,
  rest_seconds: 60,
  exertion_percent: 80,
  breakdowns: null,
  exercises: null,
  circuits: null,
  yoga_minutes: null,
  created_at: '2026-04-27T14:34:00.000Z',
};

beforeEach(() => {
  mockQ.reset();
});

describe('saveSession', () => {
  it('inserts into the "sessions" table', async () => {
    mockQ.setResult({ data: ROW, error: null });

    await saveSession({
      userId: 'user-1',
      performedAt: '2026-04-27T14:33:00.000Z',
      cardioMinutes: 30,
      tei: 42.5,
    });

    expect(mockQ.from).toHaveBeenCalledTimes(1);
    expect(mockQ.from).toHaveBeenCalledWith('sessions');
  });

  it('nulls every unsupplied optional field and defaults calculator to "standard"', async () => {
    mockQ.setResult({ data: ROW, error: null });

    await saveSession({
      userId: 'user-1',
      performedAt: '2026-04-27T14:33:00.000Z',
      cardioMinutes: 30,
      tei: 42.5,
    });

    expect(mockQ.insert).toHaveBeenCalledTimes(1);
    expect(mockQ.insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      performed_at: '2026-04-27T14:33:00.000Z',
      cardio_minutes: 30,
      tei: 42.5,
      calculator: 'standard',
      sets: null,
      rest_seconds: null,
      exertion_percent: null,
      breakdowns: null,
      exercises: null,
      circuits: null,
      yoga_minutes: null,
    });
  });

  it('maps every camelCase arg onto its snake_case column', async () => {
    mockQ.setResult({ data: ROW, error: null });

    await saveSession({
      userId: 'u2',
      performedAt: '2026-01-02T03:04:05.000Z',
      cardioMinutes: 12,
      tei: 9.5,
      calculator: 'breakdown',
      sets: 4,
      restSeconds: 90,
      exertionPercent: 75,
      breakdowns: 2,
      exercises: 6,
      circuits: 3,
      yogaMinutes: 45,
    });

    expect(mockQ.insert).toHaveBeenCalledWith({
      user_id: 'u2',
      performed_at: '2026-01-02T03:04:05.000Z',
      cardio_minutes: 12,
      tei: 9.5,
      calculator: 'breakdown',
      sets: 4,
      rest_seconds: 90,
      exertion_percent: 75,
      breakdowns: 2,
      exercises: 6,
      circuits: 3,
      yoga_minutes: 45,
    });
  });

  it('coerces explicitly-undefined optional fields to null', async () => {
    mockQ.setResult({ data: ROW, error: null });

    await saveSession({
      userId: 'u3',
      performedAt: '2026-01-02T03:04:05.000Z',
      cardioMinutes: 0,
      tei: 0,
      sets: undefined,
      restSeconds: null,
    });

    const payload = mockQ.insert.mock.calls[0][0];
    expect(payload.sets).toBeNull();
    expect(payload.rest_seconds).toBeNull();
    expect(payload.cardio_minutes).toBe(0);
    expect(payload.tei).toBe(0);
  });

  // `?? null` only replaces null/undefined, so a legitimate 0 survives.
  it('preserves a zero value rather than nulling it', async () => {
    mockQ.setResult({ data: ROW, error: null });

    await saveSession({
      userId: 'u4',
      performedAt: '2026-01-02T03:04:05.000Z',
      cardioMinutes: 10,
      tei: 1,
      sets: 0,
      exertionPercent: 0,
    });

    const payload = mockQ.insert.mock.calls[0][0];
    expect(payload.sets).toBe(0);
    expect(payload.exertion_percent).toBe(0);
  });

  it('chains insert -> select -> single', async () => {
    mockQ.setResult({ data: ROW, error: null });

    await saveSession({
      userId: 'user-1',
      performedAt: '2026-04-27T14:33:00.000Z',
      cardioMinutes: 30,
      tei: 42.5,
    });

    expect(mockQ.calls).toEqual(['from', 'insert', 'select', 'single']);
    expect(mockQ.select).toHaveBeenCalledWith();
  });

  it('returns the inserted row with a null error on success', async () => {
    mockQ.setResult({ data: ROW, error: null });

    const res = await saveSession({
      userId: 'user-1',
      performedAt: '2026-04-27T14:33:00.000Z',
      cardioMinutes: 30,
      tei: 42.5,
    });

    expect(res).toEqual({ data: ROW, error: null });
  });

  it('returns error.message as a string and null data on failure', async () => {
    mockQ.setResult({ data: null, error: { message: 'permission denied' } });

    const res = await saveSession({
      userId: 'user-1',
      performedAt: '2026-04-27T14:33:00.000Z',
      cardioMinutes: 30,
      tei: 42.5,
    });

    expect(res.data).toBeNull();
    expect(typeof res.error).toBe('string');
    expect(res.error).toBe('permission denied');
  });

  it('normalises an undefined data payload to null', async () => {
    mockQ.setResult({ data: undefined, error: null });

    const res = await saveSession({
      userId: 'user-1',
      performedAt: '2026-04-27T14:33:00.000Z',
      cardioMinutes: 30,
      tei: 42.5,
    });

    expect(res.data).toBeNull();
  });
});

describe('listSessions', () => {
  it('selects * from "sessions" newest first, defaulting to 100 rows', async () => {
    mockQ.setResult({ data: [ROW], error: null });

    const res = await listSessions();

    expect(mockQ.from).toHaveBeenCalledWith('sessions');
    expect(mockQ.select).toHaveBeenCalledWith('*');
    expect(mockQ.order).toHaveBeenCalledWith('performed_at', { ascending: false });
    expect(mockQ.limit).toHaveBeenCalledWith(100);
    expect(mockQ.calls).toEqual(['from', 'select', 'order', 'limit']);
    expect(res).toEqual({ data: [ROW], error: null });
  });

  it('honours an explicit limit', async () => {
    mockQ.setResult({ data: [], error: null });

    await listSessions(7);

    expect(mockQ.limit).toHaveBeenCalledWith(7);
  });

  it('returns an empty array when the query yields null data', async () => {
    mockQ.setResult({ data: null, error: null });

    const res = await listSessions();

    expect(res.data).toEqual([]);
    expect(res.error).toBeNull();
  });

  it('returns [] plus the error message on failure', async () => {
    mockQ.setResult({ data: null, error: { message: 'network down' } });

    const res = await listSessions();

    expect(res.data).toEqual([]);
    expect(typeof res.error).toBe('string');
    expect(res.error).toBe('network down');
  });
});

describe('listSessionsBetween', () => {
  it('uses a half-open gte/lt window ordered oldest first', async () => {
    mockQ.setResult({ data: [ROW], error: null });

    const res = await listSessionsBetween(
      '2026-04-01T00:00:00.000Z',
      '2026-05-01T00:00:00.000Z',
    );

    expect(mockQ.from).toHaveBeenCalledWith('sessions');
    expect(mockQ.select).toHaveBeenCalledWith('*');
    expect(mockQ.gte).toHaveBeenCalledWith(
      'performed_at',
      '2026-04-01T00:00:00.000Z',
    );
    expect(mockQ.lt).toHaveBeenCalledWith(
      'performed_at',
      '2026-05-01T00:00:00.000Z',
    );
    // Never `lte` — the upper bound must be exclusive.
    expect(mockQ.calls).toEqual(['from', 'select', 'gte', 'lt', 'order']);
    expect(mockQ.order).toHaveBeenCalledWith('performed_at', { ascending: true });
    expect(res).toEqual({ data: [ROW], error: null });
  });

  it('returns [] when there is no data', async () => {
    mockQ.setResult({ data: null, error: null });

    const res = await listSessionsBetween('2026-04-01', '2026-05-01');

    expect(res.data).toEqual([]);
  });

  it('returns [] plus the message on error', async () => {
    mockQ.setResult({ data: null, error: { message: 'range failed' } });

    const res = await listSessionsBetween('2026-04-01', '2026-05-01');

    expect(res.data).toEqual([]);
    expect(res.error).toBe('range failed');
    expect(typeof res.error).toBe('string');
  });
});

describe('latestSession', () => {
  it('orders newest first, limits to 1 and uses maybeSingle', async () => {
    mockQ.setResult({ data: ROW, error: null });

    const row = await latestSession();

    expect(mockQ.from).toHaveBeenCalledWith('sessions');
    expect(mockQ.select).toHaveBeenCalledWith('*');
    expect(mockQ.order).toHaveBeenCalledWith('performed_at', { ascending: false });
    expect(mockQ.limit).toHaveBeenCalledWith(1);
    expect(mockQ.calls).toEqual(['from', 'select', 'order', 'limit', 'maybeSingle']);
    expect(row).toEqual({ data: ROW, error: null });
  });

  it('returns null data when there is no row', async () => {
    mockQ.setResult({ data: null, error: null });

    await expect(latestSession()).resolves.toEqual({ data: null, error: null });
  });

  // Returns `error` like every sibling helper, so a permission or network
  // failure is distinguishable from "no sessions yet".
  it('surfaces the error rather than swallowing it', async () => {
    mockQ.setResult({ data: null, error: { message: 'permission denied' } });

    await expect(latestSession()).resolves.toEqual({
      data: null,
      error: 'permission denied',
    });
  });
});
