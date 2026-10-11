import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { renderScreen } from '../helpers/render';

const mockReloadProfile = jest.fn();
const mockGetSubscription = jest.fn();
const mockCreateCheckout = jest.fn();
const mockCreatePortal = jest.fn();
const mockConfirmCheckout = jest.fn();

jest.mock('expo-linking', () => ({ createURL: jest.fn(() => 'tei://subscribe') }));
jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return ({ source, ...props }: { source: { uri: string } }) => (
    <View testID="stripe-webview" accessibilityLabel={source.uri} {...props} />
  );
});
jest.mock('../../src/auth', () => ({
  useAuth: () => ({ reloadProfile: mockReloadProfile }),
}));
jest.mock('../../src/lib/billing', () => ({
  getSubscription: (...args: unknown[]) => mockGetSubscription(...args),
  createCheckoutSession: (...args: unknown[]) => mockCreateCheckout(...args),
  createBillingPortal: (...args: unknown[]) => mockCreatePortal(...args),
  confirmCheckoutSession: (...args: unknown[]) => mockConfirmCheckout(...args),
}));

import Subscribe from '../../app/subscribe';

const searchParams = useLocalSearchParams as jest.MockedFunction<typeof useLocalSearchParams>;

beforeEach(() => {
  mockReloadProfile.mockReset();
  mockGetSubscription.mockReset().mockResolvedValue({ data: { subscription: null }, error: null });
  mockCreateCheckout.mockReset().mockResolvedValue({
    data: { checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_123', sessionId: 'cs_test_123' },
    error: null,
  });
  mockCreatePortal.mockReset();
  mockConfirmCheckout.mockReset().mockResolvedValue({ data: { confirmed: false, subscription: null }, error: null });
  searchParams.mockReturnValue({ tier: 'premium' } as never);
});

describe('app/subscribe.tsx', () => {
  it('requests a hosted Stripe Checkout URL without collecting card data in-app', async () => {
    renderScreen(<Subscribe />);
    await waitFor(() => expect(screen.getByText('TEI Premium')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Subscribe to TEI Premium'));

    await waitFor(() => expect(mockCreateCheckout).toHaveBeenCalledWith(
      'premium', 'tei://subscribe', 'tei://subscribe',
    ));
  });

  it('opens Stripe Billing Portal for an existing subscription', async () => {
    mockGetSubscription.mockResolvedValue({
      data: { subscription: { tier: 'basic', status: 'active', cancel_at_period_end: false } }, error: null,
    });
    mockCreatePortal.mockResolvedValue({
      data: { portalUrl: 'https://billing.stripe.com/p/session/test' }, error: null,
    });
    renderScreen(<Subscribe />);
    await waitFor(() => expect(screen.getByText('Manage Billing')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Manage billing with Stripe'));

    await waitFor(() => expect(mockCreatePortal).toHaveBeenCalledWith('tei://subscribe'));
  });

  it('makes a scheduled cancellation date clear without prematurely removing access', async () => {
    mockGetSubscription.mockResolvedValue({
      data: {
        subscription: {
          tier: 'basic', status: 'active', cancel_at_period_end: true,
          current_period_end: '2026-11-11T12:00:00.000Z',
        },
      },
      error: null,
    });
    renderScreen(<Subscribe />);

    await waitFor(() => expect(screen.getByText(/It will end on (November 11, 2026|11 November 2026)/)).toBeTruthy());
    expect(screen.getByText('Manage Billing')).toBeTruthy();
  });

  it('keeps the user in the app when navigating back from Checkout', async () => {
    renderScreen(<Subscribe />);
    await waitFor(() => expect(screen.getByLabelText('Subscribe to TEI Premium')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Back'));
    expect(router.back).toHaveBeenCalled();
  });

  it('confirms a completed Checkout Session directly with the server after the return URL', async () => {
    mockConfirmCheckout.mockResolvedValue({
      data: {
        confirmed: true,
        subscription: { tier: 'premium', status: 'active', cancel_at_period_end: false },
      },
      error: null,
    });
    searchParams.mockReturnValue({
      tier: 'premium',
      stripe_checkout: 'success',
      session_id: 'cs_test_complete_123',
    } as never);
    renderScreen(<Subscribe />);

    await waitFor(() => expect(mockConfirmCheckout).toHaveBeenCalledWith('cs_test_complete_123'));
    await waitFor(() => expect(screen.getByText('Manage Billing')).toBeTruthy());
    expect(mockReloadProfile).toHaveBeenCalled();
  });
});
