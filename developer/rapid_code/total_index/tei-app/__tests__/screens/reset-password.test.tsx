import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderScreen } from '../helpers/render';

const mockUseURL = jest.fn<string | null, []>(() =>
  'tei://reset-password#access_token=access&refresh_token=refresh&type=recovery',
);
const mockSetSession = jest.fn<
  Promise<{ data: object; error: null }>,
  [{ access_token: string; refresh_token: string }]
>(async () => ({ data: {}, error: null }));
const mockVerifyOtp = jest.fn<
  Promise<{ data: object; error: null | { message: string } }>,
  [{ token_hash: string; type: string }]
>(async () => ({ data: {}, error: null }));
const mockOpenURL = jest.fn(async (_url: string) => true);
const mockCompletePasswordReset = jest.fn<Promise<string | null>, [string]>();

jest.mock('expo-linking', () => ({
  useURL: () => mockUseURL(),
  getInitialURL: jest.fn(async () => null),
  openURL: (url: string) => mockOpenURL(url),
}));
jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      setSession: (session: { access_token: string; refresh_token: string }) =>
        mockSetSession(session),
      verifyOtp: (args: { token_hash: string; type: string }) => mockVerifyOtp(args),
    },
  },
}));
jest.mock('../../src/auth', () => ({
  useAuth: () => ({ completePasswordReset: (...args: [string]) => mockCompletePasswordReset(...args) }),
}));

import { Platform } from 'react-native';
import ResetPassword, { parseRecoveryParams, toAppResetUrl } from '../../app/reset-password';

/** The link the TEI recovery email template produces. */
const EMAIL_LINK =
  'https://tei-app-blue.vercel.app/reset-password?token_hash=hash123&type=recovery';
const originalOS = Platform.OS;
const originalNavigator = global.navigator;

function browser(userAgent: string) {
  Platform.OS = 'web' as typeof Platform.OS;
  Object.defineProperty(global, 'navigator', {
    value: { userAgent, platform: '', maxTouchPoints: 0 },
    configurable: true,
  });
}

beforeEach(() => {
  mockUseURL.mockReturnValue(
    'tei://reset-password#access_token=access&refresh_token=refresh&type=recovery',
  );
  mockSetSession.mockClear();
  mockSetSession.mockResolvedValue({ data: {}, error: null });
  mockVerifyOtp.mockClear();
  mockVerifyOtp.mockResolvedValue({ data: {}, error: null });
  mockOpenURL.mockClear();
  mockCompletePasswordReset.mockReset();
  mockCompletePasswordReset.mockResolvedValue(null);
});

afterEach(() => {
  Platform.OS = originalOS;
  Object.defineProperty(global, 'navigator', { value: originalNavigator, configurable: true });
});

describe('app/reset-password.tsx — Reset completion', () => {
  it('parses both Supabase recovery URL formats', () => {
    expect(parseRecoveryParams('tei://reset-password?code=abc')).toMatchObject({
      code: 'abc',
      accessToken: null,
      refreshToken: null,
      error: null,
    });
    expect(
      parseRecoveryParams(
        'tei://reset-password#access_token=access&refresh_token=refresh&type=recovery',
      ),
    ).toMatchObject({
      code: null,
      accessToken: 'access',
      refreshToken: 'refresh',
      error: null,
    });
  });

  it('restores the recovery session and saves a valid new password', async () => {
    renderScreen(<ResetPassword />);
    await waitFor(() =>
      expect(mockSetSession).toHaveBeenCalledWith({
        access_token: 'access',
        refresh_token: 'refresh',
      }),
    );

    fireEvent.changeText(screen.getByPlaceholderText('New password'), 'Password1');
    fireEvent.changeText(
      screen.getByPlaceholderText('Confirm new password'),
      'Password1',
    );
    fireEvent.press(screen.getByText('SAVE NEW PASSWORD'));

    await waitFor(() =>
      expect(mockCompletePasswordReset).toHaveBeenCalledWith('Password1'),
    );
    expect(await screen.findByText(/Your password has been updated/)).toBeTruthy();
  });

  it('rejects an expired or incomplete link', async () => {
    mockUseURL.mockReturnValue('tei://reset-password');
    renderScreen(<ResetPassword />);

    expect(
      await screen.findByText('This password-reset link is missing or has expired.'),
    ).toBeTruthy();
    fireEvent.press(screen.getByText('REQUEST A NEW LINK'));
    expect(router.replace).toHaveBeenCalledWith('/forgot-password');
  });
});

describe('app/reset-password.tsx — TEI email link and the app hand-off', () => {
  it('reads token_hash only from a recovery link', () => {
    expect(parseRecoveryParams(EMAIL_LINK)).toMatchObject({
      tokenHash: 'hash123',
      code: null,
      accessToken: null,
    });
    expect(
      parseRecoveryParams('https://x/reset-password?token_hash=h&type=signup').tokenHash,
    ).toBeNull();
  });

  it('re-points the web link at the app, keeping query and fragment', () => {
    expect(toAppResetUrl(EMAIL_LINK)).toBe(
      'tei://reset-password?token_hash=hash123&type=recovery',
    );
    expect(toAppResetUrl('https://h/reset-password#access_token=a&refresh_token=r')).toBe(
      'tei://reset-password#access_token=a&refresh_token=r',
    );
  });

  it('verifies the token hash when the app opens the universal link', async () => {
    mockUseURL.mockReturnValue(EMAIL_LINK);
    renderScreen(<ResetPassword />);

    await waitFor(() =>
      expect(mockVerifyOtp).toHaveBeenCalledWith({ token_hash: 'hash123', type: 'recovery' }),
    );
    expect(await screen.findByPlaceholderText('New password')).toBeTruthy();
  });

  it('shows the invalid state when Supabase rejects the token hash', async () => {
    mockUseURL.mockReturnValue(EMAIL_LINK);
    mockVerifyOtp.mockResolvedValueOnce({ data: {}, error: { message: 'expired' } });
    renderScreen(<ResetPassword />);

    expect(await screen.findByText(/invalid or has expired/)).toBeTruthy();
  });

  it('on a phone browser, offers the app before spending the one-time link', async () => {
    browser('Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) Safari');
    mockUseURL.mockReturnValue(EMAIL_LINK);
    renderScreen(<ResetPassword />);

    fireEvent.press(await screen.findByText('OPEN IN THE TEI APP'));
    expect(mockOpenURL).toHaveBeenCalledWith(
      'tei://reset-password?token_hash=hash123&type=recovery',
    );
    expect(mockVerifyOtp).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('CONTINUE IN BROWSER'));
    await waitFor(() => expect(mockVerifyOtp).toHaveBeenCalledTimes(1));
    expect(await screen.findByPlaceholderText('New password')).toBeTruthy();
  });

  it('on a desktop browser, goes straight to the password form', async () => {
    browser('Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0) Chrome/140');
    mockUseURL.mockReturnValue(EMAIL_LINK);
    renderScreen(<ResetPassword />);

    await waitFor(() => expect(mockVerifyOtp).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('OPEN IN THE TEI APP')).toBeNull();
  });
});
