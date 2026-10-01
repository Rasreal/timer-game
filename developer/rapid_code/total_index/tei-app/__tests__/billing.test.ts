jest.mock('../src/lib/supabase', () => ({
  supabase: { functions: { invoke: jest.fn() } },
}));

import { supabase } from '../src/lib/supabase';
import {
  createBillingPortal,
  createCheckoutSession,
  getSubscription,
} from '../src/lib/billing';

const mockInvoke = supabase.functions.invoke as jest.Mock;

beforeEach(() => mockInvoke.mockReset());

describe('Stripe billing function client', () => {
  it('starts a Basic Checkout session through the authenticated Edge Function', async () => {
    mockInvoke.mockResolvedValue({
      data: { checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_123', sessionId: 'cs_test_123' },
      error: null,
    });

    await expect(createCheckoutSession('basic', 'tei://subscribe', 'tei://subscribe')).resolves.toEqual({
      data: { checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_123', sessionId: 'cs_test_123' },
      error: null,
    });
    expect(mockInvoke).toHaveBeenCalledWith('create-checkout-session', {
      body: { tier: 'basic', successUrl: 'tei://subscribe', cancelUrl: 'tei://subscribe' },
    });
  });

  it('returns a server-side payment error without exposing a Stripe secret', async () => {
    mockInvoke.mockResolvedValue({ data: { error: 'Stripe is not configured.' }, error: null });

    await expect(createCheckoutSession('premium', 'tei://subscribe', 'tei://subscribe')).resolves.toEqual({
      data: null,
      error: 'Stripe is not configured.',
    });
  });

  it('creates a portal session and reads the server-maintained subscription', async () => {
    mockInvoke
      .mockResolvedValueOnce({ data: { portalUrl: 'https://billing.stripe.com/p/session/test' }, error: null })
      .mockResolvedValueOnce({
        data: { subscription: { tier: 'premium', status: 'active', cancel_at_period_end: false, current_period_end: null, updated_at: '2026-10-02T00:00:00.000Z' } },
        error: null,
      });

    await expect(createBillingPortal('tei://subscribe')).resolves.toEqual({
      data: { portalUrl: 'https://billing.stripe.com/p/session/test' }, error: null,
    });
    await expect(getSubscription()).resolves.toEqual({
      data: { subscription: { tier: 'premium', status: 'active', cancel_at_period_end: false, current_period_end: null, updated_at: '2026-10-02T00:00:00.000Z' } },
      error: null,
    });
    expect(mockInvoke).toHaveBeenNthCalledWith(1, 'create-billing-portal', {
      body: { returnUrl: 'tei://subscribe' },
    });
    expect(mockInvoke).toHaveBeenNthCalledWith(2, 'get-subscription', { body: undefined });
  });
});
