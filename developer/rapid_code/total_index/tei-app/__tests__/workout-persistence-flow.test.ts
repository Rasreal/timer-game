/**
 * TEI-12 persistence contract.
 *
 * This is deliberately one level above the individual query-builder tests:
 * it exercises the public session repository as a complete write → latest
 * read → calendar-range read flow against an in-memory Supabase table double.
 */
import type { SessionRow } from '../src/lib/database.types';

const mockRows: SessionRow[] = [];
const mockFrom = jest.fn();
let mockSequence = 0;

function mockBuilder() {
  let inserted: SessionRow | null = null;
  let fromIso: string | null = null;
  let toIso: string | null = null;
  let ascending = true;
  let rowLimit: number | null = null;

  const query = () => {
    let rows = mockRows.filter(
      (row) =>
        (fromIso === null || row.performed_at >= fromIso) &&
        (toIso === null || row.performed_at < toIso),
    );
    rows = rows.sort((a, b) =>
      ascending
        ? a.performed_at.localeCompare(b.performed_at)
        : b.performed_at.localeCompare(a.performed_at),
    );
    return rowLimit === null ? rows : rows.slice(0, rowLimit);
  };

  const builder = {
    insert: (payload: Omit<SessionRow, 'id' | 'created_at'>) => {
      mockSequence += 1;
      inserted = {
        ...payload,
        id: `session-${mockSequence}`,
        created_at: `2026-09-25T12:00:0${mockSequence}.000Z`,
      };
      mockRows.push(inserted);
      return builder;
    },
    select: () => builder,
    gte: (_column: string, value: string) => {
      fromIso = value;
      return builder;
    },
    lt: (_column: string, value: string) => {
      toIso = value;
      return builder;
    },
    order: (_column: string, options: { ascending: boolean }) => {
      ascending = options.ascending;
      return builder;
    },
    limit: (value: number) => {
      rowLimit = value;
      return builder;
    },
    single: async () => ({ data: inserted, error: null }),
    maybeSingle: async () => ({ data: query()[0] ?? null, error: null }),
    then: (
      resolve: (value: { data: SessionRow[]; error: null }) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve({ data: query(), error: null }).then(resolve, reject),
  };

  return builder;
}

mockFrom.mockImplementation((table: string) => {
  if (table !== 'sessions') throw new Error(`Unexpected table: ${table}`);
  return mockBuilder();
});

jest.mock('../src/lib/supabase', () => ({
  supabase: { from: (...args: [string]) => mockFrom(...args) },
}));

import {
  latestSession,
  listSessionsBetween,
  saveSession,
} from '../src/lib/sessions';

beforeEach(() => {
  mockRows.length = 0;
  mockFrom.mockClear();
  mockSequence = 0;
});

describe('TEI-12 — workout persistence flow', () => {
  it('writes all inputs and metrics, then exposes them through latest and calendar reads', async () => {
    const standard = await saveSession({
      userId: 'user-1',
      performedAt: '2026-09-05T08:30:00.000Z',
      calculator: 'standard',
      sets: 11,
      restSeconds: 60,
      exertionPercent: 80,
      cardioMinutes: 41,
      tei: 13.78,
    });
    const yoga = await saveSession({
      userId: 'user-1',
      performedAt: '2026-09-18T18:45:00.000Z',
      calculator: 'yoga',
      yogaMinutes: 59,
      exertionPercent: 100,
      cardioMinutes: 17,
      tei: 14.3,
    });

    expect(standard.error).toBeNull();
    expect(standard.data).toMatchObject({
      user_id: 'user-1',
      performed_at: '2026-09-05T08:30:00.000Z',
      created_at: expect.stringMatching(/^2026-09-25T12:00:01/),
      calculator: 'standard',
      sets: 11,
      rest_seconds: 60,
      exertion_percent: 80,
      cardio_minutes: 41,
      tei: 13.78,
    });
    expect(yoga.data).toMatchObject({
      calculator: 'yoga',
      yoga_minutes: 59,
      exertion_percent: 100,
      cardio_minutes: 17,
      // The standard-only fields are deliberately stored as null.
      sets: null,
      rest_seconds: null,
      breakdowns: null,
      exercises: null,
      circuits: null,
    });

    await expect(latestSession()).resolves.toMatchObject({
      error: null,
      data: expect.objectContaining({ id: yoga.data?.id, tei: 14.3 }),
    });

    await expect(
      listSessionsBetween(
        '2026-09-01T00:00:00.000Z',
        '2026-10-01T00:00:00.000Z',
      ),
    ).resolves.toMatchObject({
      error: null,
      data: [
        expect.objectContaining({ id: standard.data?.id }),
        expect.objectContaining({ id: yoga.data?.id }),
      ],
    });
  });

  it('keeps calendar reads in the requested half-open date range', async () => {
    await saveSession({
      userId: 'user-1',
      performedAt: '2026-08-31T23:59:59.999Z',
      cardioMinutes: 10,
      tei: 1,
    });
    await saveSession({
      userId: 'user-1',
      performedAt: '2026-09-01T00:00:00.000Z',
      cardioMinutes: 10,
      tei: 2,
    });
    await saveSession({
      userId: 'user-1',
      performedAt: '2026-10-01T00:00:00.000Z',
      cardioMinutes: 10,
      tei: 3,
    });

    const result = await listSessionsBetween(
      '2026-09-01T00:00:00.000Z',
      '2026-10-01T00:00:00.000Z',
    );

    expect(result).toMatchObject({
      error: null,
      data: [
        expect.objectContaining({
          performed_at: '2026-09-01T00:00:00.000Z',
          tei: 2,
        }),
      ],
    });
  });
});
