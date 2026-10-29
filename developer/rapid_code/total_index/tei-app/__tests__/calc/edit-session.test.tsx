/**
 * Correcting a saved session (Ken's 22 Oct 2026 edits): a long press on the
 * Review calendar opens the session in its calculator, where values and the
 * date can be changed and saved back, or the session deleted.
 */
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Keyboard } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Calculator from '../../app/calculator';
import CircuitCalculator from '../../app/calc/circuit';
import { calculateTei, displayTei } from '../../src/lib/tei';
import type { SessionRow } from '../../src/lib/database.types';
import { makeAuth, renderCalc } from '../helpers/calcRender';

jest.mock('../../src/lib/supabase', () => ({ supabase: {} }));
jest.mock('../../src/auth', () => ({ useAuth: jest.fn() }));
jest.mock('../../src/lib/sessions', () => ({
  saveSession: jest.fn(async () => ({ error: null })),
  updateSession: jest.fn(async () => ({ data: null, error: null })),
  deleteSession: jest.fn(async () => ({ error: null })),
}));
jest.mock('../../src/lib/plans', () => ({
  savePlan: jest.fn(async () => ({ error: null })),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useAuth } = require('../../src/auth');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { saveSession, updateSession, deleteSession } = require('../../src/lib/sessions');

const STANDARD: SessionRow = {
  id: 'session-42',
  user_id: 'user-1',
  performed_at: '2026-10-20T13:15:00.000Z',
  sets: 11,
  rest_seconds: 60,
  exertion_percent: 80,
  cardio_minutes: 41,
  breakdowns: null,
  exercises: null,
  circuits: null,
  yoga_minutes: null,
  tei: 13.78,
  calculator: 'standard',
  created_at: '2026-10-20T13:16:00.000Z',
};

const CIRCUIT: SessionRow = {
  ...STANDARD,
  id: 'circuit-7',
  sets: null,
  rest_seconds: null,
  exercises: 4,
  circuits: 5,
  exertion_percent: 55,
  cardio_minutes: 10,
  tei: 14.15,
  calculator: 'circuit',
};

function auth(tier: 'elemental' | 'basic' | 'premium') {
  (useAuth as jest.Mock).mockReturnValue(makeAuth(tier));
}

beforeEach(() => {
  auth('basic');
  (useLocalSearchParams as jest.Mock).mockReturnValue({});
  (router as unknown as { canGoBack: jest.Mock }).canGoBack = jest.fn(() => true);
});

describe('Standard calculator — editing a saved session', () => {
  it('opens with the saved values, date and score already shown', () => {
    renderCalc(<Calculator />, { load: STANDARD });

    expect(screen.getByText('Editing Session')).toBeTruthy();
    expect(screen.getByText(String(displayTei(13.78)))).toBeTruthy();
    expect(screen.getByLabelText('Delete this session')).toBeTruthy();
  });

  it('SAVE updates the same row instead of inserting a new one, then returns', async () => {
    const { store } = renderCalc(<Calculator />, { load: STANDARD });

    fireEvent.press(screen.getByText('SAVE'));

    await waitFor(() => expect(updateSession).toHaveBeenCalled());
    expect(saveSession).not.toHaveBeenCalled();
    const [id, args] = (updateSession as jest.Mock).mock.calls[0];
    expect(id).toBe('session-42');
    // The saved timestamp is kept — it is when the training happened.
    expect(args.performedAt).toBe(STANDARD.performed_at);
    expect(args.sets).toBe(11);
    expect(router.back).toHaveBeenCalled();
    // The draft leaves edit mode so the next calculation is a new session.
    expect(store.current().editing).toBeUndefined();
  });

  it('a corrected value must be re-calculated before it saves', async () => {
    const { store } = renderCalc(<Calculator />, { load: STANDARD });

    store.set('sets', 12);
    fireEvent.press(screen.getByText('SAVE'));
    expect(updateSession).not.toHaveBeenCalled();
    expect(store.toast()).toBe('Calculate the TEI before saving.');

    fireEvent.press(screen.getByText('Calculate TEI'));
    fireEvent.press(screen.getByText('SAVE'));
    await waitFor(() => expect(updateSession).toHaveBeenCalled());
    const [, args] = (updateSession as jest.Mock).mock.calls[0];
    expect(args.sets).toBe(12);
    expect(args.tei).toBe(
      Number(
        calculateTei({ sets: 12, restSeconds: 60, exertionPercent: 80, cardioMinutes: 41 }).tei.toFixed(2),
      ),
    );
  });

  it('shows the update error and stays on the screen', async () => {
    (updateSession as jest.Mock).mockResolvedValueOnce({ data: null, error: 'permission denied' });
    renderCalc(<Calculator />, { load: STANDARD });

    fireEvent.press(screen.getByText('SAVE'));

    expect(await screen.findByText('Could not save session: permission denied')).toBeTruthy();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('deletes after confirmation', async () => {
    const { store } = renderCalc(<Calculator />, { load: STANDARD });

    fireEvent.press(screen.getByLabelText('Delete this session'));
    expect(screen.getByText('Delete this session?')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Confirm delete'));

    await waitFor(() => expect(deleteSession).toHaveBeenCalledWith('session-42'));
    expect(router.back).toHaveBeenCalled();
    expect(store.current().editing).toBeUndefined();
  });

  it('Keep closes the confirmation without deleting', () => {
    renderCalc(<Calculator />, { load: STANDARD });

    fireEvent.press(screen.getByLabelText('Delete this session'));
    fireEvent.press(screen.getByLabelText('Keep session'));
    expect(deleteSession).not.toHaveBeenCalled();
  });

  it('back discards the correction and leaves edit mode', () => {
    const { store } = renderCalc(<Calculator />, { load: STANDARD });

    fireEvent.press(screen.getByLabelText('Back'));
    expect(router.back).toHaveBeenCalled();
    expect(store.current().editing).toBeUndefined();
  });

  it('a new calculation (no session loaded) still inserts', async () => {
    renderCalc(<Calculator />, {
      seed: { sets: 11, restSeconds: 60, exertionPercent: 80, cardioMinutes: 41 },
    });

    expect(screen.queryByLabelText('Delete this session')).toBeNull();
    fireEvent.press(screen.getByText('Calculate TEI'));
    fireEvent.press(screen.getByText('SAVE'));
    await waitFor(() => expect(saveSession).toHaveBeenCalled());
    expect(updateSession).not.toHaveBeenCalled();
  });
});

describe('Premium calculators — editing a saved session', () => {
  it('opens a Circuit session with its score and updates that row', async () => {
    auth('premium');
    renderCalc(<CircuitCalculator />, { load: CIRCUIT });

    expect(screen.getByText('Editing Session')).toBeTruthy();
    expect(screen.getByText(String(displayTei(14.15)))).toBeTruthy();

    fireEvent.press(screen.getByText('SAVE'));
    await waitFor(() => expect(updateSession).toHaveBeenCalled());
    const [id, args] = (updateSession as jest.Mock).mock.calls[0];
    expect(id).toBe('circuit-7');
    expect(args).toMatchObject({ calculator: 'circuit', exercises: 4, circuits: 5 });
    expect(router.back).toHaveBeenCalled();
  });

  it('lets a member now on Basic correct a session saved on Premium', async () => {
    auth('basic');
    renderCalc(<CircuitCalculator />, { load: CIRCUIT });

    expect(router.replace).not.toHaveBeenCalledWith('/home');
    fireEvent.press(screen.getByText('SAVE'));
    await waitFor(() => expect(updateSession).toHaveBeenCalled());
  });

  it('a draft loaded for another calculator is not edited here', () => {
    auth('premium');
    renderCalc(<CircuitCalculator />, { load: STANDARD });

    expect(screen.queryByText('Editing Session')).toBeNull();
    expect(screen.queryByLabelText('Delete this session')).toBeNull();
  });
});

describe('calculator keypad (19 Oct 2026 edits)', () => {
  type Handler = (e: { endCoordinates: { height: number } }) => void;
  let handlers: Record<string, Handler>;

  beforeEach(() => {
    handlers = {};
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, handler: Handler) => {
      handlers[event] = handler;
      return { remove: jest.fn() };
    }) as never);
  });

  afterEach(() => jest.restoreAllMocks());

  function showKeypad() {
    const show = handlers.keyboardWillShow ?? handlers.keyboardDidShow;
    act(() => show({ endCoordinates: { height: 300 } }));
  }

  it('disables SAVE on Basic while the keypad is up', () => {
    renderCalc(<Calculator />, {
      seed: { sets: 11, restSeconds: 60, exertionPercent: 80, cardioMinutes: 41 },
    });

    // Calculated first, so the only thing stopping SAVE is the open keypad.
    fireEvent.press(screen.getByText('Calculate TEI'));
    showKeypad();
    fireEvent.press(screen.getByText('SAVE'));
    expect(saveSession).not.toHaveBeenCalled();

    act(() => handlers[Object.keys(handlers).find((k) => k.endsWith('Hide'))!]({ endCoordinates: { height: 0 } }));
    fireEvent.press(screen.getByText('SAVE'));
    expect(saveSession).toHaveBeenCalled();
  });

  it('keeps Effective Ranges enabled on Elemental while the keypad is up', () => {
    auth('elemental');
    renderCalc(<Calculator />);

    showKeypad();
    fireEvent.press(screen.getByText('Effective Ranges'));
    expect(router.push).toHaveBeenCalledWith('/ranges');
  });

  it('Calculate TEI closes the keypad', () => {
    const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
    renderCalc(<Calculator />, {
      seed: { sets: 11, restSeconds: 60, exertionPercent: 80, cardioMinutes: 41 },
    });

    showKeypad();
    fireEvent.press(screen.getByText('Calculate TEI'));
    expect(dismiss).toHaveBeenCalled();
  });
});
