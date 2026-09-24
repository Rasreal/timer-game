import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderScreen } from '../helpers/render';

const mockCreateURL = jest.fn<string, [string]>(() => 'tei://reset-password');
const mockRequestPasswordReset = jest.fn<
  Promise<string | null>,
  [string, string]
>();

jest.mock('expo-linking', () => ({ createURL: (path: string) => mockCreateURL(path) }));
jest.mock('../../src/lib/supabase', () => ({ supabase: {} }));
jest.mock('../../src/auth', () => ({
  useAuth: () => ({ requestPasswordReset: (...args: [string, string]) => mockRequestPasswordReset(...args) }),
}));

import ForgotPassword from '../../app/forgot-password';

beforeEach(() => {
  mockCreateURL.mockClear();
  mockRequestPasswordReset.mockReset();
  mockRequestPasswordReset.mockResolvedValue(null);
});

describe('app/forgot-password.tsx — Reset request', () => {
  it('renders the email reset form', () => {
    renderScreen(<ForgotPassword />);
    expect(screen.getByText(/Reset\s+password/)).toBeTruthy();
    expect(screen.getByPlaceholderText('Email')).toBeTruthy();
    expect(screen.getByText('SEND RESET LINK')).toBeTruthy();
  });

  it('sends the email to Supabase with the native/web reset route', async () => {
    renderScreen(<ForgotPassword />);
    fireEvent.changeText(screen.getByPlaceholderText('Email'), '  ada@example.com  ');
    fireEvent.press(screen.getByText('SEND RESET LINK'));

    await waitFor(() =>
      expect(mockRequestPasswordReset).toHaveBeenCalledWith(
        '  ada@example.com  ',
        'tei://reset-password',
      ),
    );
    expect(mockCreateURL).toHaveBeenCalledWith('reset-password');
    expect(
      await screen.findByText(/If an account matches that email/),
    ).toBeTruthy();
  });

  it('shows an API failure and does not claim that an email was sent', async () => {
    mockRequestPasswordReset.mockResolvedValue('Email rate limit exceeded');
    renderScreen(<ForgotPassword />);
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'ada@example.com');
    fireEvent.press(screen.getByText('SEND RESET LINK'));

    expect(await screen.findByText('Email rate limit exceeded')).toBeTruthy();
    expect(screen.queryByText(/If an account matches that email/)).toBeNull();
  });

  it('returns to the login screen', () => {
    renderScreen(<ForgotPassword />);
    fireEvent.press(screen.getByText('← Back to log in'));
    expect(router.replace).toHaveBeenCalledWith('/login');
  });
});
