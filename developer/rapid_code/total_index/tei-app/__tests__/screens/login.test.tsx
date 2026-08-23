import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderScreen } from '../helpers/render';

jest.mock('../../src/lib/supabase', () => ({ supabase: {} }));

const mockSignIn = jest.fn<Promise<string | null>, [string, string]>();

jest.mock('../../src/auth', () => ({
  useAuth: () => ({
    signIn: (...args: [string, string]) => mockSignIn(...args),
    signUp: jest.fn(),
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

import Login from '../../app/login';

const VALID_EMAIL = 'runner@example.com';
const VALID_PASSWORD = 'Password1';

function fillForm(email = VALID_EMAIL, password = VALID_PASSWORD) {
  fireEvent.changeText(screen.getByPlaceholderText('Email'), email);
  fireEvent.changeText(screen.getByPlaceholderText('Password'), password);
}

beforeEach(() => {
  mockSignIn.mockReset();
  mockSignIn.mockResolvedValue(null);
});

describe('app/login.tsx — Onboarding / Log In', () => {
  it('renders without crashing', () => {
    expect(() => renderScreen(<Login />)).not.toThrow();
  });

  it('shows the stacked TOTAL / EFFECT / INDEX lockup and the welcome copy', () => {
    renderScreen(<Login />);

    expect(screen.getByText('TOTAL')).toBeTruthy();
    expect(screen.getByText('EFFECT')).toBeTruthy();
    expect(screen.getByText('INDEX')).toBeTruthy();
    expect(screen.getByText('TEI')).toBeTruthy();
    expect(screen.getByText('Welcome')).toBeTruthy();
    expect(screen.getByText('Log In')).toBeTruthy();
    expect(screen.getByText('LOG IN')).toBeTruthy();
    expect(screen.getByText(/Create account/)).toBeTruthy();
    // The brand lockup from Chrome.tsx.
    expect(screen.getByText('Simple.')).toBeTruthy();
    expect(screen.getByText('RHIN')).toBeTruthy();
  });

  it('renders empty email and password fields', () => {
    renderScreen(<Login />);
    expect(screen.getByPlaceholderText('Email').props.value).toBe('');
    expect(screen.getByPlaceholderText('Password').props.value).toBe('');
  });

  it('does not show the "Forgot password?" dev affordance (SHOW_DEV_TOOLS is off)', () => {
    renderScreen(<Login />);
    expect(screen.queryByText('Forgot password?')).toBeNull();
  });

  it('typing updates both inputs', () => {
    renderScreen(<Login />);
    fillForm();
    expect(screen.getByPlaceholderText('Email').props.value).toBe(VALID_EMAIL);
    expect(screen.getByPlaceholderText('Password').props.value).toBe(
      VALID_PASSWORD,
    );
  });

  it('shows the validation hint once a field is touched but the form is invalid', () => {
    renderScreen(<Login />);
    expect(
      screen.queryByText('Enter an email and a password of at least 8 characters.'),
    ).toBeNull();

    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'a@b.co');

    expect(
      screen.getByText('Enter an email and a password of at least 8 characters.'),
    ).toBeTruthy();
  });

  it('hides the hint once email and an 8+ char password are entered', () => {
    renderScreen(<Login />);
    fillForm();
    expect(
      screen.queryByText('Enter an email and a password of at least 8 characters.'),
    ).toBeNull();
  });

  it('does not call signIn while the form is invalid (short password)', () => {
    renderScreen(<Login />);
    fillForm(VALID_EMAIL, 'short');

    fireEvent.press(screen.getByText('LOG IN'));

    expect(mockSignIn).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('submitting calls signIn with the raw email + password and replaces to /loading', async () => {
    renderScreen(<Login />);
    fillForm();

    fireEvent.press(screen.getByText('LOG IN'));

    await waitFor(() =>
      expect(mockSignIn).toHaveBeenCalledWith(VALID_EMAIL, VALID_PASSWORD),
    );
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/loading'));
  });

  it('the password field submits on onSubmitEditing too', async () => {
    renderScreen(<Login />);
    fillForm();

    fireEvent(screen.getByPlaceholderText('Password'), 'submitEditing');

    await waitFor(() =>
      expect(mockSignIn).toHaveBeenCalledWith(VALID_EMAIL, VALID_PASSWORD),
    );
  });

  it('renders the error returned by a failed signIn', async () => {
    mockSignIn.mockResolvedValue('Email rate limit exceeded');
    renderScreen(<Login />);
    fillForm();

    fireEvent.press(screen.getByText('LOG IN'));

    expect(await screen.findByText('Email rate limit exceeded')).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('maps Supabase\'s "Invalid login credentials" to friendly copy', async () => {
    mockSignIn.mockResolvedValue('Invalid login credentials');
    renderScreen(<Login />);
    fillForm();

    fireEvent.press(screen.getByText('LOG IN'));

    expect(
      await screen.findByText(
        'That email and password combination is not recognised.',
      ),
    ).toBeTruthy();
  });

  it('shows the busy "…" label while signIn is in flight', async () => {
    let resolve: (v: string | null) => void = () => {};
    mockSignIn.mockReturnValue(
      new Promise<string | null>((r) => {
        resolve = r;
      }),
    );
    renderScreen(<Login />);
    fillForm();

    fireEvent.press(screen.getByText('LOG IN'));

    expect(await screen.findByText('…')).toBeTruthy();
    resolve(null);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/loading'));
  });

  it('"Create account" pushes /account-type', () => {
    renderScreen(<Login />);
    fireEvent.press(screen.getByText(/Create account/));
    expect(router.push).toHaveBeenCalledWith('/account-type');
  });
});
