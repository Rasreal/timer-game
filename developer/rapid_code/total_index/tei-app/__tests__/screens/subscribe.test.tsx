import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { renderScreen } from '../helpers/render';

const mockReloadProfile = jest.fn();
const mockGetSubscription = jest.fn();
const mockCreateCheckout = jest.fn();
const mockCreatePortal = jest.fn();
const mockConfirmCheckout = jest.fn();
const mockChangeSubscription = jest.fn();
const mockJoin = jest.fn();
const mockAuth: { profile: { tier: string } | null } = { profile: null };

jest.mock('expo-linking', () => ({ createURL: jest.fn(() => 'tei://subscribe') }));
jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return ({ source, ...props }: { source: { uri: string } }) => (
    <View testID="stripe-webview" accessibilityLabel={source.uri} {...props} />
  );
});
jest.mock('../../src/auth', () => ({
  useAuth: () => ({ reloadProfile: mockReloadProfile, profile: mockAuth.profile }),
}));
jest.mock('../../src/lib/waitlist', () => ({
  ...jest.requireActual('../../src/lib/waitlist'),
  joinPremiumWaitlist: (...args: unknown[]) => mockJoin(...args),
}));
jest.mock('../../src/lib/billing', () => ({
  getSubscription: (...args: unknown[]) => mockGetSubscription(...args),
  createCheckoutSession: (...args: unknown[]) => mockCreateCheckout(...args),
  createBillingPortal: (...args: unknown[]) => mockCreatePortal(...args),
  confirmCheckoutSession: (...args: unknown[]) => mockConfirmCheckout(...args),
  changeSubscription: (...args: unknown[]) => mockChangeSubscription(...args),
}));
jest.mock('../../src/lib/supabase', () => ({ supabase: {} }));

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
  mockChangeSubscription.mockReset();
  mockJoin.mockReset().mockResolvedValue({ error: null });
  mockAuth.profile = null;
  searchParams.mockReturnValue({ tier: 'basic' } as never);
});

describe('app/subscribe.tsx', () => {
  it('requests a hosted Stripe Checkout URL without collecting card data in-app', async () => {
    renderScreen(<Subscribe />);
    await waitFor(() => expect(screen.getByText('TEI Basic')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Subscribe to TEI Basic'));

    await waitFor(() => expect(mockCreateCheckout).toHaveBeenCalledWith(
      'basic', 'tei://subscribe', 'tei://subscribe',
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
    await waitFor(() => expect(screen.getByLabelText('Subscribe to TEI Basic')).toBeTruthy());

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

describe('app/subscribe.tsx — Premium is in development', () => {
  beforeEach(() => {
    searchParams.mockReturnValue({ tier: 'premium' } as never);
  });

  it('offers the waitlist instead of Stripe Checkout', () => {
    renderScreen(<Subscribe />);

    expect(screen.getByText(/TEI Premium is in development/)).toBeTruthy();
    expect(screen.queryByLabelText('Subscribe to TEI Premium')).toBeNull();
    expect(mockCreateCheckout).not.toHaveBeenCalled();
  });

  it('joining the waitlist sends the user back to pick a TEI', async () => {
    renderScreen(<Subscribe />);

    fireEvent.press(screen.getByText('Join the WAITLIST'));
    fireEvent.changeText(screen.getByLabelText('Email'), 'ken@example.com');
    fireEvent.press(screen.getByLabelText('Send'));

    await waitFor(() => expect(mockJoin).toHaveBeenCalledWith('ken@example.com', ''));
    fireEvent.press(await screen.findByText('Pick a TEI for now'));
    expect(router.replace).toHaveBeenCalledWith('/account-type');
  });
});

describe('app/subscribe.tsx — switch to Elemental', () => {
  const activeBasic = {
    tier: 'basic', status: 'active', cancel_at_period_end: false,
    current_period_end: '2026-11-11T12:00:00.000Z',
  };

  beforeEach(() => {
    searchParams.mockReturnValue({ change: 'elemental' } as never);
    mockAuth.profile = { tier: 'basic' };
  });

  it('explains that Basic lasts until the paid period ends', async () => {
    mockGetSubscription.mockResolvedValue({ data: { subscription: activeBasic }, error: null });
    renderScreen(<Subscribe />);

    expect(await screen.findByText(/you keep Basic until (November 11, 2026|11 November 2026)/)).toBeTruthy();
    expect(screen.getByText('Switch to TEI Elemental')).toBeTruthy();
  });

  it('cancels at period end and lets the user change their mind', async () => {
    mockGetSubscription.mockResolvedValue({ data: { subscription: activeBasic }, error: null });
    mockChangeSubscription.mockResolvedValue({
      data: { subscription: { ...activeBasic, cancel_at_period_end: true }, tier: 'basic' },
      error: null,
    });
    renderScreen(<Subscribe />);

    fireEvent.press(await screen.findByText('Switch to Elemental'));

    await waitFor(() => expect(mockChangeSubscription).toHaveBeenCalledWith('cancel'));
    expect(await screen.findByText(/Done\. TEI Basic stays active until/)).toBeTruthy();
    expect(mockReloadProfile).toHaveBeenCalled();
    expect(screen.getByText('Keep TEI Basic')).toBeTruthy();
  });

  it('a scheduled switch offers Keep TEI Basic', async () => {
    mockGetSubscription.mockResolvedValue({
      data: { subscription: { ...activeBasic, cancel_at_period_end: true } }, error: null,
    });
    mockChangeSubscription.mockResolvedValue({ data: { subscription: activeBasic, tier: 'basic' }, error: null });
    renderScreen(<Subscribe />);

    fireEvent.press(await screen.findByText('Keep TEI Basic'));

    await waitFor(() => expect(mockChangeSubscription).toHaveBeenCalledWith('resume'));
    expect(await screen.findByText('You’re staying on TEI Basic.')).toBeTruthy();
  });

  it('a paid tier without a Stripe subscription switches straight away', async () => {
    mockChangeSubscription.mockResolvedValue({ data: { subscription: null, tier: 'elemental' }, error: null });
    renderScreen(<Subscribe />);

    expect(await screen.findByText(/Switching takes effect straight away/)).toBeTruthy();
    fireEvent.press(screen.getByText('Switch to Elemental'));

    expect(await screen.findByText('Done. You’re now on TEI Elemental.')).toBeTruthy();
  });

  it('shows the server error and keeps the button', async () => {
    mockGetSubscription.mockResolvedValue({ data: { subscription: activeBasic }, error: null });
    mockChangeSubscription.mockResolvedValue({ data: null, error: 'Stripe is not configured.' });
    renderScreen(<Subscribe />);

    fireEvent.press(await screen.findByText('Switch to Elemental'));

    expect(await screen.findByText('Stripe is not configured.')).toBeTruthy();
    expect(screen.getByText('Switch to Elemental')).toBeTruthy();
  });
});
