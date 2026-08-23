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

import AccountType from '../../app/account-type';

beforeEach(() => {
  mockAuth.session = null;
  mockAuth.profile = null;
  mockChangeTier.mockReset();
  mockChangeTier.mockResolvedValue(null);
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
    expect(screen.getByText(/Premium - \$11 per month/)).toBeTruthy();
  });

  it('hides the prototype "plans switch instantly" note when signed out', () => {
    renderScreen(<AccountType />);
    expect(
      screen.queryByText('Prototype: plans switch instantly, with no payment.'),
    ).toBeNull();
  });

  it('Elemental (Helpful) pushes /create-account', () => {
    renderScreen(<AccountType />);
    fireEvent.press(screen.getByText('Helpful'));
    expect(router.push).toHaveBeenCalledWith('/create-account');
  });

  // Basic and Premium are "dummy" only in that the prototype ships Elemental
  // features; the buttons themselves are NOT no-ops — signed out, they take the
  // identical path as Elemental (setPendingTier + push('/create-account')) with
  // no paywall or "coming soon" gate anywhere in the source.
  it('Basic (Insightful) also pushes /create-account — no payment gate', () => {
    renderScreen(<AccountType />);
    fireEvent.press(screen.getByText('Insightful'));
    expect(router.push).toHaveBeenCalledWith('/create-account');
  });

  it('Premium (Transformative) also pushes /create-account — no payment gate', () => {
    renderScreen(<AccountType />);
    fireEvent.press(screen.getByText('Transformative'));
    expect(router.push).toHaveBeenCalledWith('/create-account');
  });

  it('signed out, choosing a tier never calls changeTier', () => {
    renderScreen(<AccountType />);
    fireEvent.press(screen.getByText('Transformative'));
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
    expect(screen.getByText('TEI Basic')).toBeTruthy();
    expect(screen.getByText('$5 per month')).toBeTruthy();
    expect(screen.getByText('TEI Premium')).toBeTruthy();
    expect(screen.getByText('$11 per month')).toBeTruthy();

    // Elemental + Basic both list the Standard calculator feature.
    expect(screen.getAllByText('• Standard TEI Calculator')).toHaveLength(2);
    expect(screen.getByText('• Save All Session TEI Values')).toBeTruthy();
    expect(
      screen.getByText('• Choose from 5 Different Training Formats'),
    ).toBeTruthy();
    expect(
      screen.getByText('• Progress Bars and Quick References'),
    ).toBeTruthy();
    expect(
      screen.getByText('• Save & Track Your Week, Month, Year, etc...'),
    ).toBeTruthy();
    expect(screen.getByText('• Workload Designer & Planner')).toBeTruthy();
    expect(screen.getAllByText('SELECT')).toHaveLength(3);
  });

  it('a SELECT inside the sheet chooses that plan and pushes /create-account', () => {
    renderScreen(<AccountType />);
    fireEvent.press(screen.getByLabelText('More about Transformative'));

    fireEvent.press(screen.getAllByText('SELECT')[2]);

    expect(router.push).toHaveBeenCalledWith('/create-account');
    expect(screen.queryByText('The 3 TEI')).toBeNull();
  });

  it('"Select Your TEI" commits the highlighted plan and pushes /create-account', () => {
    renderScreen(<AccountType />);
    fireEvent.press(screen.getByLabelText('More about Helpful'));

    fireEvent.press(screen.getByLabelText('Highlight TEI Premium'));
    fireEvent.press(screen.getByText('Select Your TEI'));

    expect(router.push).toHaveBeenCalledWith('/create-account');
    expect(screen.queryByText('The 3 TEI')).toBeNull();
  });

  // Nothing is preselected — the sheet is an explainer first — so with no plan
  // highlighted the CTA just dismisses rather than committing a stray choice.
  it('"Select Your TEI" only dismisses when no plan is highlighted', () => {
    renderScreen(<AccountType />);
    fireEvent.press(screen.getByLabelText('More about Helpful'));

    fireEvent.press(screen.getByText('Select Your TEI'));

    expect(screen.queryByText('The 3 TEI')).toBeNull();
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

  it('shows the prototype switching note', () => {
    renderScreen(<AccountType />);
    expect(
      screen.getByText('Prototype: plans switch instantly, with no payment.'),
    ).toBeTruthy();
  });

  it('marks the active plan with a check', () => {
    renderScreen(<AccountType />);
    expect(screen.getByText(/Helpful\s+✓/)).toBeTruthy();
  });

  it('picking a different tier calls changeTier and replaces to /home', async () => {
    renderScreen(<AccountType />);

    fireEvent.press(screen.getByText('Transformative'));

    await waitFor(() => expect(mockChangeTier).toHaveBeenCalledWith('premium'));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/home'));
    expect(router.push).not.toHaveBeenCalled();
  });

  it('re-picking the current tier is a no-op (toast only, no changeTier, no nav)', () => {
    renderScreen(<AccountType />);

    fireEvent.press(screen.getByText(/Helpful/));

    expect(mockChangeTier).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('a failed changeTier leaves the user on the screen', async () => {
    mockChangeTier.mockResolvedValue('permission denied for function set_my_tier');
    renderScreen(<AccountType />);

    fireEvent.press(screen.getByText('Insightful'));

    await waitFor(() => expect(mockChangeTier).toHaveBeenCalledWith('basic'));
    await waitFor(() => expect(router.replace).not.toHaveBeenCalled());
  });
});
