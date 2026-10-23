jest.mock('../src/lib/supabase', () => ({
  supabase: { rpc: jest.fn() },
}));

import { supabase } from '../src/lib/supabase';
import { isValidEmail, joinPremiumWaitlist } from '../src/lib/waitlist';

const mockRpc = supabase.rpc as jest.Mock;

beforeEach(() => mockRpc.mockReset());

describe('Premium waitlist client', () => {
  it('sends the trimmed email and name to the database function', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    await expect(joinPremiumWaitlist('  ken@example.com ', ' Ken ')).resolves.toEqual({ error: null });
    expect(mockRpc).toHaveBeenCalledWith('join_premium_waitlist', {
      waitlist_email: 'ken@example.com',
      waitlist_name: 'Ken',
    });
  });

  it('returns the database error message', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Enter a valid email address.' } });

    await expect(joinPremiumWaitlist('x@y.z')).resolves.toEqual({
      error: 'Enter a valid email address.',
    });
  });

  it.each([
    ['ken@example.com', true],
    [' ken@example.com ', true],
    ['ken@example', false],
    ['ken example@x.com', false],
    ['', false],
  ])('isValidEmail(%p) is %p', (value, expected) => {
    expect(isValidEmail(value)).toBe(expected);
  });
});
