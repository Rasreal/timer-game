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
const mockCompletePasswordReset = jest.fn<Promise<string | null>, [string]>();

jest.mock('expo-linking', () => ({
  useURL: () => mockUseURL(),
  getInitialURL: jest.fn(async () => null),
}));
jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      setSession: (session: { access_token: string; refresh_token: string }) =>
        mockSetSession(session),
    },
  },
}));
jest.mock('../../src/auth', () => ({
  useAuth: () => ({ completePasswordReset: (...args: [string]) => mockCompletePasswordReset(...args) }),
}));

import ResetPassword, { parseRecoveryParams } from '../../app/reset-password';

beforeEach(() => {
  mockUseURL.mockReturnValue(
    'tei://reset-password#access_token=access&refresh_token=refresh&type=recovery',
  );
  mockSetSession.mockClear();
  mockSetSession.mockResolvedValue({ data: {}, error: null });
  mockCompletePasswordReset.mockReset();
  mockCompletePasswordReset.mockResolvedValue(null);
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
