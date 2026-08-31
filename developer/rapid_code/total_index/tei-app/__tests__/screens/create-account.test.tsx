import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderScreen } from '../helpers/render';

jest.mock('../../src/lib/supabase', () => ({ supabase: {} }));

type SignUpResult = { error: string | null; needsEmailConfirmation: boolean };

const mockSignUp = jest.fn<Promise<SignUpResult>, [Record<string, unknown>]>();

jest.mock('../../src/auth', () => ({
  useAuth: () => ({
    signIn: jest.fn(),
    signUp: (args: Record<string, unknown>) => mockSignUp(args),
    signOut: jest.fn(),
    updateProfile: jest.fn(),
    changeTier: jest.fn(),
    reloadProfile: jest.fn(),
    session: null,
    profile: null,
    profileError: null,
    initializing: false,
  }),
}));

import CreateAccount from '../../app/create-account';

const VALID_PASSWORD = 'Password1';

/** The screen has no testIDs; the inputs are ordered First, Last, Email, Password. */
function inputs() {
  return screen.UNSAFE_getAllByType(
    require('react-native').TextInput as never,
  ) as unknown as Array<{ props: { value: string } }>;
}

/** The CTA text node — "Create Account" also appears as the page heading. */
function submitButton() {
  return screen.getAllByText(/Create Account/).slice(-1)[0];
}

function fillValid({ accept = true }: { accept?: boolean } = {}) {
  const [first, last, email, password] = inputs();
  fireEvent.changeText(first as never, 'Ada');
  fireEvent.changeText(last as never, 'Lovelace');
  fireEvent.changeText(email as never, 'ada@example.com');
  fireEvent.changeText(password as never, VALID_PASSWORD);
  if (accept) {
    fireEvent.press(screen.getByLabelText('Accept terms and conditions'));
  }
}

beforeEach(() => {
  mockSignUp.mockReset();
  mockSignUp.mockResolvedValue({ error: null, needsEmailConfirmation: false });
});

describe('app/create-account.tsx — Create TEI Account', () => {
  it('renders without crashing', () => {
    expect(() => renderScreen(<CreateAccount />)).not.toThrow();
  });

  it('shows the header copy, the account-type block and every field label', () => {
    renderScreen(<CreateAccount />);

    expect(screen.getByLabelText('RHINO ATHLETICS')).toBeTruthy();
    expect(screen.getByText('Simple.')).toBeTruthy();
    expect(screen.getAllByText(/Create Account/).length).toBeGreaterThan(0);
    expect(screen.getByText('Account Type Selected')).toBeTruthy();
    expect(screen.getByText(/First Name/)).toBeTruthy();
    expect(screen.getByText(/Last Name/)).toBeTruthy();
    expect(screen.getByText(/^Email/)).toBeTruthy();
    expect(screen.getByText(/^Password/)).toBeTruthy();
    expect(screen.getByText('Terms and Conditions')).toBeTruthy();
    expect(screen.getByText(/I accept/)).toBeTruthy();
  });

  it('defaults the account type to the store default tier, Elemental', () => {
    renderScreen(<CreateAccount />);
    // Rendered as "TEI <Elemental>"; the tier is a nested Text leaf.
    expect(screen.getByText('Elemental')).toBeTruthy();
  });

  it('lists the three password rules', () => {
    renderScreen(<CreateAccount />);
    expect(screen.getByText('○ At least 8 characters')).toBeTruthy();
    expect(screen.getByText('○ At least one number')).toBeTruthy();
    expect(screen.getByText('○ At least one upper case letter')).toBeTruthy();
  });

  it('typing updates each of the four inputs', () => {
    renderScreen(<CreateAccount />);
    const [first, last, email, password] = inputs();

    fireEvent.changeText(first as never, 'Ada');
    fireEvent.changeText(last as never, 'Lovelace');
    fireEvent.changeText(email as never, 'ada@example.com');
    fireEvent.changeText(password as never, VALID_PASSWORD);

    const after = inputs();
    expect(after[0].props.value).toBe('Ada');
    expect(after[1].props.value).toBe('Lovelace');
    expect(after[2].props.value).toBe('ada@example.com');
    expect(after[3].props.value).toBe(VALID_PASSWORD);
  });

  it('the eye toggle flips password masking and its accessibility label', () => {
    renderScreen(<CreateAccount />);
    expect(inputs()[3]).toBeTruthy();
    expect(
      (inputs()[3] as unknown as { props: { secureTextEntry: boolean } }).props
        .secureTextEntry,
    ).toBe(true);

    fireEvent.press(screen.getByLabelText('Show password'));

    expect(
      (inputs()[3] as unknown as { props: { secureTextEntry: boolean } }).props
        .secureTextEntry,
    ).toBe(false);
    expect(screen.getByLabelText('Hide password')).toBeTruthy();
  });

  it('the terms checkbox is disabled until the password passes every rule', () => {
    renderScreen(<CreateAccount />);
    const checkbox = screen.getByLabelText('Accept terms and conditions');

    expect(checkbox.props.accessibilityState).toMatchObject({
      checked: false,
      disabled: true,
    });

    fireEvent.press(checkbox);
    expect(
      screen.getByLabelText('Accept terms and conditions').props
        .accessibilityState,
    ).toMatchObject({ checked: false });

    fireEvent.changeText(inputs()[3] as never, VALID_PASSWORD);
    fireEvent.press(screen.getByLabelText('Accept terms and conditions'));

    expect(
      screen.getByLabelText('Accept terms and conditions').props
        .accessibilityState,
    ).toMatchObject({ checked: true, disabled: false });
  });

  it('does not call signUp while the form is incomplete', () => {
    renderScreen(<CreateAccount />);

    fireEvent.press(submitButton());

    expect(mockSignUp).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('does not call signUp when the terms box is left unchecked', () => {
    renderScreen(<CreateAccount />);
    fillValid({ accept: false });

    fireEvent.press(submitButton());

    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('submits with the pending tier and replaces to /loading on success', async () => {
    renderScreen(<CreateAccount />);
    fillValid();

    fireEvent.press(submitButton());

    await waitFor(() =>
      expect(mockSignUp).toHaveBeenCalledWith({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        password: VALID_PASSWORD,
        tier: 'elemental',
      }),
    );
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/loading'));
  });

  it('routes to /login when the project requires email confirmation', async () => {
    mockSignUp.mockResolvedValue({ error: null, needsEmailConfirmation: true });
    renderScreen(<CreateAccount />);
    fillValid();

    fireEvent.press(submitButton());

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
    expect(router.replace).not.toHaveBeenCalledWith('/loading');
  });

  it('renders the error message from a failed signUp and stays put', async () => {
    mockSignUp.mockResolvedValue({
      error: 'An account with that email already exists. Try logging in.',
      needsEmailConfirmation: false,
    });
    renderScreen(<CreateAccount />);
    fillValid();

    fireEvent.press(submitButton());

    expect(
      await screen.findByText(
        'An account with that email already exists. Try logging in.',
      ),
    ).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('shows the "Creating…" busy label while signUp is in flight', async () => {
    let resolve: (v: SignUpResult) => void = () => {};
    mockSignUp.mockReturnValue(
      new Promise<SignUpResult>((r) => {
        resolve = r;
      }),
    );
    renderScreen(<CreateAccount />);
    fillValid();

    fireEvent.press(submitButton());

    expect(await screen.findByText(/Creating…/)).toBeTruthy();
    resolve({ error: null, needsEmailConfirmation: false });
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/loading'));
  });

  it('the back arrow calls router.back()', () => {
    renderScreen(<CreateAccount />);
    fireEvent.press(screen.getByLabelText('Back'));
    expect(router.back).toHaveBeenCalled();
  });

  it('"Change account type" replaces to /account-type', () => {
    renderScreen(<CreateAccount />);
    fireEvent.press(screen.getByLabelText('Change account type'));
    expect(router.replace).toHaveBeenCalledWith('/account-type');
  });

  it('the Terms and Conditions link only toasts placeholder copy — it does not navigate', () => {
    renderScreen(<CreateAccount />);

    fireEvent.press(screen.getByText('Terms and Conditions'));

    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  // SUSPECTED BUG: the password-rule bullets never change glyph. `Rule` always
  // renders "○ " and only recolours the text (colors.success vs #333), so a
  // satisfied rule is indistinguishable in any non-colour context (screen
  // readers, greyscale, snapshot text). Asserted as-is per current behaviour.
  it('password rule bullets stay "○" even once the rule is satisfied', () => {
    renderScreen(<CreateAccount />);
    fireEvent.changeText(inputs()[3] as never, VALID_PASSWORD);

    expect(screen.getByText('○ At least 8 characters')).toBeTruthy();
    expect(screen.getByText('○ At least one number')).toBeTruthy();
    expect(screen.getByText('○ At least one upper case letter')).toBeTruthy();
  });
});
