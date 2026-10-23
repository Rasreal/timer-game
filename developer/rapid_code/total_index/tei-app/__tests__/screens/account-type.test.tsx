import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderScreen } from '../helpers/render';

jest.mock('../../src/lib/supabase', () => ({ supabase: {} }));

const mockChangeTier = jest.fn<Promise<string | null>, [string]>();
const mockAuth: {
  session: unknown;
  profile: { tier: string } | null;
} = { session: null, profile: null };

jest.mock('../../src/auth', () => ({
  useAuth: () => ({
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    updateProfile: jest.fn(),
    reloadProfile: jest.fn(),
    profileError: null,
    initializing: false,
    session: mockAuth.session,
    profile: mockAuth.profile,
    changeTier: (t: string) => mockChangeTier(t),
  }),
}));

const mockJoin = jest.fn<Promise<{ error: string | null }>, [string, string?]>();
jest.mock('../../src/lib/waitlist', () => ({
  ...jest.requireActual('../../src/lib/waitlist'),
  joinPremiumWaitlist: (email: string, name?: string) => mockJoin(email, name),
}));

import AccountType from '../../app/account-type';

beforeEach(() => {
  mockAuth.session = null;
  mockAuth.profile = null;
  mockChangeTier.mockReset();
  mockChangeTier.mockResolvedValue(null);
  mockJoin.mockReset();
  mockJoin.mockResolvedValue({ error: null });
});

describe('app/account-type.tsx — Account Type Selection (signed out)', () => {
  it('renders without crashing', () => {
    expect(() => renderScreen(<AccountType />)).not.toThrow();
  });

  it('renders the header lockup and the framing question', () => {
    renderScreen(<AccountType />);

    expect(screen.getByText('TOTAL EFFECT INDEX')).toBeTruthy();
    // "TEI" appears both in the header lockup and inside the question copy.
    expect(screen.getAllByText('TEI').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(
        /What kind of training information do you want\s+TEI\s+to provide\?/,
      ),
    ).toBeTruthy();
  });

  it('renders all three tiers with their pill labels and price sublines', () => {
    renderScreen(<AccountType />);

    expect(screen.getByText('Helpful')).toBeTruthy();
    expect(screen.getByText('Insightful')).toBeTruthy();
    expect(screen.getByText('Transformative')).toBeTruthy();

    expect(screen.getByText(/Elemental - FREE/)).toBeTruthy();
    expect(screen.getByText(/Basic - \$5 per month/)).toBeTruthy();
    // Premium is in development, so its subline offers the waitlist.
    expect(screen.getByText(/Premium -\s*WAITLIST/)).toBeTruthy();
    expect(screen.queryByText(/\$11 per month/)).toBeNull();
  });

  it('hides the signed-in current-plan note when signed out', () => {
    renderScreen(<AccountType />);
    expect(screen.queryByText(/Tap another plan to switch/)).toBeNull();
  });

  it('Elemental (Helpful) pushes /create-account', () => {
    renderScreen(<AccountType />);
    fireEvent.press(screen.getByText('Helpful'));
    expect(router.push).toHaveBeenCalledWith('/create-account');
  });

  it('Basic (Insightful) also pushes /create-account', () => {
    renderScreen(<AccountType />);
    fireEvent.press(screen.getByText('Insightful'));
    expect(router.push).toHaveBeenCalledWith('/create-account');
  });

  it('Premium (Transformative) opens the WAITLIST form instead of sign-up', () => {
    renderScreen(<AccountType />);
    fireEvent.press(screen.getByText('Transformative'));

    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByText(/TEI Premium is in development/)).toBeTruthy();
    expect(screen.getByText('IN DEVELOPMENT')).toBeTruthy();
  });

  it('SEND joins the waitlist and returns to the tier choice', async () => {
    renderScreen(<AccountType />);
    fireEvent.press(screen.getByText('Transformative'));

    fireEvent.changeText(screen.getByLabelText('Name'), 'Ken');
    fireEvent.changeText(screen.getByLabelText('Email'), 'ken@example.com');
    fireEvent.press(screen.getByLabelText('Send'));

    await waitFor(() => expect(mockJoin).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.queryByText(/TEI Premium is in development/)).toBeNull(),
    );
    expect(mockJoin).toHaveBeenCalledWith('ken@example.com', 'Ken');
    expect(screen.getByText('Helpful')).toBeTruthy();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('SEND stays disabled until the email looks valid', () => {
    renderScreen(<AccountType />);
    fireEvent.press(screen.getByText('Transformative'));

    fireEvent.changeText(screen.getByLabelText('Email'), 'not-an-email');
    fireEvent.press(screen.getByLabelText('Send'));

    expect(mockJoin).not.toHaveBeenCalled();
  });

  it('a waitlist failure keeps the form open with the error', async () => {
    mockJoin.mockResolvedValue({ error: 'Network down' });
    renderScreen(<AccountType />);
    fireEvent.press(screen.getByText('Transformative'));

    fireEvent.changeText(screen.getByLabelText('Email'), 'ken@example.com');
    fireEvent.press(screen.getByLabelText('Send'));

    expect(await screen.findByText('Network down')).toBeTruthy();
    expect(screen.getByText(/TEI Premium is in development/)).toBeTruthy();
  });

  it('the waitlist close button returns without joining', () => {
    renderScreen(<AccountType />);
    fireEvent.press(screen.getByText('Transformative'));

    fireEvent.press(screen.getByLabelText('Close waitlist'));

    expect(screen.queryByText(/TEI Premium is in development/)).toBeNull();
    expect(mockJoin).not.toHaveBeenCalled();
  });

  it('signed out, choosing a tier never calls changeTier', () => {
    renderScreen(<AccountType />);
    fireEvent.press(screen.getByText('Insightful'));
    expect(mockChangeTier).not.toHaveBeenCalled();
  });

  it('the back arrow goes back when the stack allows it', () => {
    (router as unknown as { canGoBack?: unknown }).canGoBack = jest.fn(
      () => true,
    );
    renderScreen(<AccountType />);

    fireEvent.press(screen.getByLabelText('Back'));

    expect(router.back).toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalledWith('/home');
  });

  it('the back arrow replaces to /home when there is nothing to go back to', () => {
    (router as unknown as { canGoBack?: unknown }).canGoBack = jest.fn(
      () => false,
    );
    renderScreen(<AccountType />);

    fireEvent.press(screen.getByLabelText('Back'));

    expect(router.replace).toHaveBeenCalledWith('/home');
    expect(router.back).not.toHaveBeenCalled();
  });
});

describe('app/account-type.tsx — "The 3 TEI" features sheet', () => {
  it('each tier ellipsis opens the same sheet', () => {
    renderScreen(<AccountType />);
    expect(screen.queryByText('The 3 TEI')).toBeNull();

    fireEvent.press(screen.getByLabelText('More about Helpful'));
    expect(screen.getByText('The 3 TEI')).toBeTruthy();
    expect(screen.getByText('Which one is for YOU?')).toBeTruthy();
  });

  it('the sheet lists all three plans with their prices and feature copy', () => {
    renderScreen(<AccountType />);
    fireEvent.press(screen.getByLabelText('More about Insightful'));

    expect(screen.getByText('TEI Elemental')).toBeTruthy();
    expect(screen.getByText('$0 per month')).toBeTruthy();
    expect(screen.getByText('Calculate Your Workload')).toBeTruthy();
    expect(
      screen.getByText(
        'Use the Standard TEI Calculator to give each strength training session a numerical workload value.',
      ),
    ).toBeTruthy();

    expect(screen.getByText('TEI Basic')).toBeTruthy();
    expect(screen.getByText('$5 per month')).toBeTruthy();
    expect(screen.getByText('Calculate. Save. Review.')).toBeTruthy();
    expect(screen.getByText('Everything in Elemental, plus:')).toBeTruthy();
    expect(
      screen.getByText('Save Your Sessions - Build a history of your TEI values.'),
    ).toBeTruthy();

    expect(screen.getByText('TEI Premium')).toBeTruthy();
    expect(screen.getByText('$11 per month')).toBeTruthy();
    expect(screen.getByText('IN DEVELOPMENT')).toBeTruthy();
    expect(screen.getByText('Measure. Understand. Plan.')).toBeTruthy();
    expect(screen.getByText('Everything in Basic, plus:')).toBeTruthy();
    expect(screen.getByText(/^5 Training Formats - /)).toBeTruthy();
    expect(screen.getByText(/^Workload Designer & Planner - /)).toBeTruthy();
    expect(screen.getByText(/Choose from 11 accent colors/)).toBeTruthy();
    expect(
      screen.getByText('Your Training. Your Workload. Your Intelligence.'),
    ).toBeTruthy();

    // Elemental and Basic can be selected; Premium offers the waitlist.
    expect(screen.getAllByText('SELECT')).toHaveLength(2);
    expect(screen.getByLabelText('Join the TEI Premium waitlist')).toBeTruthy();
  });

  it('a SELECT inside the sheet chooses that plan and pushes /create-account', () => {
    renderScreen(<AccountType />);
    fireEvent.press(screen.getByLabelText('More about Transformative'));

    fireEvent.press(screen.getByLabelText('Select TEI Basic'));

    expect(router.push).toHaveBeenCalledWith('/create-account');
    expect(screen.queryByText('The 3 TEI')).toBeNull();
  });

  it('WAITLIST in the sheet opens the form, and SEND returns to the sheet', async () => {
    renderScreen(<AccountType />);
    fireEvent.press(screen.getByLabelText('More about Helpful'));

    fireEvent.press(screen.getByLabelText('Join the TEI Premium waitlist'));
    fireEvent.changeText(screen.getByLabelText('Email'), 'ken@example.com');
    fireEvent.press(screen.getByLabelText('Send'));

    await waitFor(() => expect(mockJoin).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.queryByText(/TEI Premium is in development/)).toBeNull(),
    );
    expect(screen.getByText('The 3 TEI')).toBeTruthy();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('"Select Your TEI" returns to the Account Type Selection screen', () => {
    renderScreen(<AccountType />);
    fireEvent.press(screen.getByLabelText('More about Helpful'));

    fireEvent.press(screen.getByText('Select Your TEI'));

    expect(screen.queryByText('The 3 TEI')).toBeNull();
    expect(screen.getByText('Helpful')).toBeTruthy();
    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('the sheet close button dismisses without selecting', () => {
    renderScreen(<AccountType />);
    fireEvent.press(screen.getByLabelText('More about Helpful'));

    fireEvent.press(screen.getByLabelText('Close'));

    expect(screen.queryByText('The 3 TEI')).toBeNull();
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe('app/account-type.tsx — signed-in upgrade/downgrade mode', () => {
  beforeEach(() => {
    mockAuth.session = { user: { id: 'u1' } };
    mockAuth.profile = { tier: 'elemental' };
  });

  it('says which plan is current and how to switch', () => {
    renderScreen(<AccountType />);
    expect(
      screen.getByText('You’re on TEI Elemental. Tap another plan to switch.'),
    ).toBeTruthy();
  });

  it('marks the active plan with a check', () => {
    renderScreen(<AccountType />);
    expect(screen.getByText(/Helpful\s+✓/)).toBeTruthy();
  });

  it('picking Premium offers the waitlist rather than Stripe Checkout', () => {
    renderScreen(<AccountType />);

    fireEvent.press(screen.getByText('Transformative'));

    expect(screen.getByText(/TEI Premium is in development/)).toBeTruthy();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('re-picking the current tier is a no-op (toast only, no nav)', () => {
    renderScreen(<AccountType />);

    fireEvent.press(screen.getByText(/Helpful/));

    expect(mockChangeTier).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('picking Basic opens the Basic Stripe Checkout', async () => {
    renderScreen(<AccountType />);

    fireEvent.press(screen.getByText('Insightful'));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/subscribe?tier=basic'));
  });

  it('on Basic, picking Elemental opens the switch-to-Elemental screen', () => {
    mockAuth.profile = { tier: 'basic' };
    renderScreen(<AccountType />);

    fireEvent.press(screen.getByText('Helpful'));

    expect(router.push).toHaveBeenCalledWith('/subscribe?change=elemental');
  });

  it('an account already on Premium keeps it as its current plan', () => {
    mockAuth.profile = { tier: 'premium' };
    renderScreen(<AccountType />);

    expect(screen.getByText(/Transformative\s+✓/)).toBeTruthy();
    fireEvent.press(screen.getByText(/Transformative/));
    expect(screen.queryByText(/TEI Premium is in development/)).toBeNull();
    expect(router.push).not.toHaveBeenCalled();
  });
});
