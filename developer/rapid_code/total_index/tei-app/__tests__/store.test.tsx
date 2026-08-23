import React, { type ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react-native';
import {
  StoreProvider,
  useStore,
  formatSessionDate,
  type SessionDraft,
} from '../src/store';

const wrapper = ({ children }: { children: ReactNode }) => (
  <StoreProvider>{children}</StoreProvider>
);

const renderStore = () => renderHook(() => useStore(), { wrapper });

const NUMERIC_FIELDS: (keyof Omit<SessionDraft, 'date'>)[] = [
  'sets',
  'restSeconds',
  'exertionPercent',
  'cardioMinutes',
  'breakdowns',
  'exercises',
  'circuits',
  'yogaMinutes',
];

describe('useStore outside a provider', () => {
  it('throws a helpful error', () => {
    expect(() => renderHook(() => useStore())).toThrow(
      'useStore must be used inside <StoreProvider>',
    );
  });
});

describe('initial state', () => {
  it('defaults pendingTier to "elemental"', () => {
    const { result } = renderStore();
    expect(result.current.pendingTier).toBe('elemental');
  });

  it('defaults targetRange and toast to null', () => {
    const { result } = renderStore();
    expect(result.current.targetRange).toBeNull();
    expect(result.current.toast).toBeNull();
  });

  it('starts with every numeric session field null', () => {
    const { result } = renderStore();
    for (const field of NUMERIC_FIELDS) {
      expect(result.current.session[field]).toBeNull();
    }
  });

  it('defaults the session date to now as an ISO string', () => {
    const before = Date.now();
    const { result } = renderStore();
    const after = Date.now();

    const t = new Date(result.current.session.date).getTime();
    expect(Number.isNaN(t)).toBe(false);
    expect(t).toBeGreaterThanOrEqual(before - 1000);
    expect(t).toBeLessThanOrEqual(after + 1000);
    expect(result.current.session.date).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  it('exposes every action as a function', () => {
    const { result } = renderStore();
    for (const key of [
      'setPendingTier',
      'setTargetRange',
      'setSessionField',
      'setSessionDate',
      'resetSession',
      'showToast',
    ] as const) {
      expect(typeof result.current[key]).toBe('function');
    }
  });
});

describe('setPendingTier', () => {
  it.each(['elemental', 'basic', 'premium'] as const)(
    'sets the tier to "%s"',
    (tier) => {
      const { result } = renderStore();
      act(() => result.current.setPendingTier(tier));
      expect(result.current.pendingTier).toBe(tier);
    },
  );

  it('keeps the latest of successive writes', () => {
    const { result } = renderStore();
    act(() => result.current.setPendingTier('basic'));
    act(() => result.current.setPendingTier('premium'));
    expect(result.current.pendingTier).toBe('premium');
  });
});

describe('setTargetRange', () => {
  it('stores a label', () => {
    const { result } = renderStore();
    act(() => result.current.setTargetRange('WEEKLY'));
    expect(result.current.targetRange).toBe('WEEKLY');
  });

  it('can be cleared back to null', () => {
    const { result } = renderStore();
    act(() => result.current.setTargetRange('MONTHLY'));
    act(() => result.current.setTargetRange(null));
    expect(result.current.targetRange).toBeNull();
  });
});

describe('setSessionField', () => {
  it.each(NUMERIC_FIELDS)('sets "%s"', (field) => {
    const { result } = renderStore();
    act(() => result.current.setSessionField(field, 12));
    expect(result.current.session[field]).toBe(12);
  });

  it.each(NUMERIC_FIELDS)('can clear "%s" back to null', (field) => {
    const { result } = renderStore();
    act(() => result.current.setSessionField(field, 12));
    act(() => result.current.setSessionField(field, null));
    expect(result.current.session[field]).toBeNull();
  });

  it.each(NUMERIC_FIELDS)('accepts 0 for "%s" without coercing to null', (field) => {
    const { result } = renderStore();
    act(() => result.current.setSessionField(field, 0));
    expect(result.current.session[field]).toBe(0);
  });

  it('leaves the other fields untouched', () => {
    const { result } = renderStore();
    act(() => result.current.setSessionField('sets', 4));
    act(() => result.current.setSessionField('restSeconds', 90));

    expect(result.current.session.sets).toBe(4);
    expect(result.current.session.restSeconds).toBe(90);
    expect(result.current.session.exertionPercent).toBeNull();
    expect(result.current.session.circuits).toBeNull();
  });

  it('does not disturb the session date', () => {
    const { result } = renderStore();
    const date = result.current.session.date;
    act(() => result.current.setSessionField('sets', 4));
    expect(result.current.session.date).toBe(date);
  });

  it('replaces the session object rather than mutating it', () => {
    const { result } = renderStore();
    const before = result.current.session;
    act(() => result.current.setSessionField('sets', 4));
    expect(result.current.session).not.toBe(before);
    expect(before.sets).toBeNull();
  });
});

describe('setSessionDate', () => {
  it('sets the ISO date', () => {
    const { result } = renderStore();
    act(() => result.current.setSessionDate('2026-04-27T14:33:00.000Z'));
    expect(result.current.session.date).toBe('2026-04-27T14:33:00.000Z');
  });

  it('preserves the numeric fields', () => {
    const { result } = renderStore();
    act(() => result.current.setSessionField('sets', 3));
    act(() => result.current.setSessionDate('2026-04-27T14:33:00.000Z'));
    expect(result.current.session.sets).toBe(3);
  });

  // SUSPECTED BUG: setSessionDate does no validation, so an unparseable string
  // is stored verbatim and only blows up later in formatSessionDate.
  it('SUSPECTED BUG: stores a non-ISO string verbatim', () => {
    const { result } = renderStore();
    act(() => result.current.setSessionDate('not-a-date'));
    expect(result.current.session.date).toBe('not-a-date');
  });
});

describe('resetSession', () => {
  it('clears every numeric field', () => {
    const { result } = renderStore();

    act(() => {
      for (const field of NUMERIC_FIELDS) {
        result.current.setSessionField(field, 5);
      }
    });
    for (const field of NUMERIC_FIELDS) {
      expect(result.current.session[field]).toBe(5);
    }

    act(() => result.current.resetSession());

    for (const field of NUMERIC_FIELDS) {
      expect(result.current.session[field]).toBeNull();
    }
  });

  it('resets the date back to now', () => {
    const { result } = renderStore();
    act(() => result.current.setSessionDate('2000-01-01T00:00:00.000Z'));

    const before = Date.now();
    act(() => result.current.resetSession());

    const t = new Date(result.current.session.date).getTime();
    expect(t).toBeGreaterThanOrEqual(before - 1000);
  });

  it('leaves pendingTier and targetRange alone', () => {
    const { result } = renderStore();
    act(() => result.current.setPendingTier('premium'));
    act(() => result.current.setTargetRange('WEEKLY'));
    act(() => result.current.resetSession());

    expect(result.current.pendingTier).toBe('premium');
    expect(result.current.targetRange).toBe('WEEKLY');
  });

  it('is safe to call on an already-empty session', () => {
    const { result } = renderStore();
    act(() => result.current.resetSession());
    expect(result.current.session.sets).toBeNull();
  });
});

describe('showToast', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('sets the toast message immediately', () => {
    const { result } = renderStore();
    act(() => result.current.showToast('Saved'));
    expect(result.current.toast).toBe('Saved');
  });

  it('is still showing just before 2600ms', () => {
    const { result } = renderStore();
    act(() => result.current.showToast('Saved'));
    act(() => {
      jest.advanceTimersByTime(2599);
    });
    expect(result.current.toast).toBe('Saved');
  });

  it('auto-clears at exactly 2600ms', () => {
    const { result } = renderStore();
    act(() => result.current.showToast('Saved'));
    act(() => {
      jest.advanceTimersByTime(2600);
    });
    expect(result.current.toast).toBeNull();
  });

  it('replaces the message when called again', () => {
    const { result } = renderStore();
    act(() => result.current.showToast('First'));
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    act(() => result.current.showToast('Second'));
    expect(result.current.toast).toBe('Second');
  });

  // showToast clears the previous timer, so an earlier toast can no longer
  // blank its replacement early: each toast gets its own full 2600ms.
  it('gives a replacement toast its own full lifetime', () => {
    const { result } = renderStore();
    act(() => result.current.showToast('First'));
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    act(() => result.current.showToast('Second'));

    // The first toast's timer would have fired here; it was cleared.
    act(() => {
      jest.advanceTimersByTime(1600);
    });
    expect(result.current.toast).toBe('Second');

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.toast).toBeNull();
  });

  it('clears the pending timer on unmount', () => {
    const { result, unmount } = renderStore();
    act(() => result.current.showToast('First'));

    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe('formatSessionDate', () => {
  it('formats an afternoon timestamp', () => {
    expect(formatSessionDate(new Date(2026, 3, 27, 14, 33).toISOString())).toBe(
      'April 27, 2026 - 2:33pm',
    );
  });

  it('formats a morning timestamp', () => {
    expect(formatSessionDate(new Date(2026, 0, 5, 9, 5).toISOString())).toBe(
      'January 5, 2026 - 9:05am',
    );
  });

  it('renders noon as 12pm', () => {
    expect(formatSessionDate(new Date(2026, 3, 27, 12, 0).toISOString())).toBe(
      'April 27, 2026 - 12:00pm',
    );
  });

  it('renders midnight as 12am', () => {
    expect(formatSessionDate(new Date(2026, 3, 27, 0, 0).toISOString())).toBe(
      'April 27, 2026 - 12:00am',
    );
  });

  it('zero-pads minutes but not the hour or the day', () => {
    expect(formatSessionDate(new Date(2026, 6, 4, 1, 7).toISOString())).toBe(
      'July 4, 2026 - 1:07am',
    );
  });

  it('flips the meridiem at 11:59am / 12:00pm', () => {
    expect(formatSessionDate(new Date(2026, 3, 27, 11, 59).toISOString())).toBe(
      'April 27, 2026 - 11:59am',
    );
    expect(formatSessionDate(new Date(2026, 3, 27, 23, 59).toISOString())).toBe(
      'April 27, 2026 - 11:59pm',
    );
  });

  it('uses lowercase am/pm, unlike sessionTime', () => {
    const out = formatSessionDate(new Date(2026, 3, 27, 14, 33).toISOString());
    expect(out).toContain('pm');
    expect(out).not.toContain('PM');
  });

  it('reads the store default date without throwing', () => {
    const { result } = renderStore();
    expect(() => formatSessionDate(result.current.session.date)).not.toThrow();
  });
});
