/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Chainable query-builder double for the Supabase client.
 *
 * Every builder method records its call and returns the same thenable object,
 * so `from(..).select(..).gte(..).lt(..).order(..)` resolves to a configurable
 * `{ data, error }`. Terminal awaits and `.single()` / `.maybeSingle()` all
 * read from the same configured result.
 */

export interface MockResult {
  data: any;
  error: { message: string } | null;
}

export interface QueryMock {
  from: jest.Mock;
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  upsert: jest.Mock;
  delete: jest.Mock;
  eq: jest.Mock;
  gte: jest.Mock;
  lt: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  /** Order in which chain methods were invoked, e.g. ['from','select','gte']. */
  calls: string[];
  setResult: (r: MockResult) => void;
  reset: () => void;
}

export function createQueryMock(): QueryMock {
  let result: MockResult = { data: null, error: null };
  const calls: string[] = [];

  const builder: any = {};

  const chain = (name: string) =>
    jest.fn((...args: any[]) => {
      calls.push(name);
      void args;
      return builder;
    });

  const terminal = (name: string) =>
    jest.fn(async (...args: any[]) => {
      calls.push(name);
      void args;
      return result;
    });

  builder.select = chain('select');
  builder.insert = chain('insert');
  builder.update = chain('update');
  builder.upsert = chain('upsert');
  builder.delete = chain('delete');
  builder.eq = chain('eq');
  builder.gte = chain('gte');
  builder.lt = chain('lt');
  builder.order = chain('order');
  builder.limit = chain('limit');
  builder.single = terminal('single');
  builder.maybeSingle = terminal('maybeSingle');

  // Awaiting the builder itself (no .single()) resolves to the same result.
  builder.then = (resolve: any, reject: any) =>
    Promise.resolve(result).then(resolve, reject);

  const from = jest.fn((table: string) => {
    calls.push('from');
    void table;
    return builder;
  });

  builder.from = from;

  return {
    from,
    select: builder.select,
    insert: builder.insert,
    update: builder.update,
    upsert: builder.upsert,
    delete: builder.delete,
    eq: builder.eq,
    gte: builder.gte,
    lt: builder.lt,
    order: builder.order,
    limit: builder.limit,
    single: builder.single,
    maybeSingle: builder.maybeSingle,
    calls,
    setResult: (r: MockResult) => {
      result = r;
    },
    reset: () => {
      result = { data: null, error: null };
      calls.length = 0;
    },
  };
}
