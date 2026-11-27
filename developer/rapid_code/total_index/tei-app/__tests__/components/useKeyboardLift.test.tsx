/**
 * src/components/useKeyboardLift.ts — the calculator keypad scroll, with the
 * larger rings from Ken's 11 Nov 2026 edits.
 */
import { act, renderHook } from '@testing-library/react-native';
import { Keyboard, TextInput } from 'react-native';
import { useKeyboardLift } from '../../src/components/useKeyboardLift';

type Listener = (e: unknown) => void;
type Measure = (cb: (x: number, y: number, w: number, h: number) => void) => void;

const layout = (y: number, height: number) =>
  ({ nativeEvent: { layout: { x: 0, y, width: 300, height } } }) as never;

/** A focused ring field at this window position, or none with null. */
function focus(windowY: number | null) {
  jest
    .spyOn(TextInput.State, 'currentlyFocusedInput')
    .mockReturnValue(
      (windowY === null
        ? null
        : { measureInWindow: ((cb) => cb(0, windowY, 120, 60)) as Measure }) as never,
    );
}

function setup(spacer: number) {
  jest.useFakeTimers();
  const listeners: Record<string, Listener[]> = {};
  jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, cb: Listener) => {
    (listeners[event] ??= []).push(cb);
    return { remove: jest.fn() };
  }) as never);
  jest.spyOn(global, 'requestAnimationFrame').mockImplementation((cb) => {
    cb(0);
    return 0;
  });
  focus(null);
  const { result } = renderHook(() => useKeyboardLift(60, { spacer }));
  const scrollTo = jest.fn();
  (result.current.scrollRef as { current: unknown }).current = { scrollTo };
  // iOS preset: the "will" events drive it. Keypad top edge at 538.
  const open = () => {
    act(() =>
      listeners.keyboardWillShow?.forEach((cb) =>
        cb({ endCoordinates: { height: 336, screenY: 538, screenX: 0, width: 402 } }),
      ),
    );
    act(() => jest.advanceTimersByTime(200));
  };
  const close = () => act(() => listeners.keyboardWillHide?.forEach((cb) => cb({})));
  return { result, scrollTo, open, close };
}

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('useKeyboardLift', () => {
  it('puts the session date at the top when everything fits above the keypad', () => {
    const { result, scrollTo, open } = setup(8);
    result.current.onAnchorLayout(layout(250, 50));
    result.current.onRingsLayout(layout(310, 120));
    result.current.belowLayout('cta')(layout(0, 50));
    open();
    // CTAs end at 430 + 8 + 50 + 12 = 500, well above the keypad once the
    // date is at the top (250 - 60 = 190).
    expect(scrollTo).toHaveBeenCalledWith({ y: 190, animated: true });
  });

  it('scrolls past the date only when the rings and CTAs would reach the keypad', () => {
    const { result, scrollTo, open, close } = setup(8);
    result.current.onAnchorLayout(layout(250, 50));
    result.current.belowLayout('cta')(layout(0, 50));
    // Two 163pt rows of rings: 642 + 8 + 50 + 12 - 538 = 174, under 190.
    result.current.onRingsLayout(layout(310, 332));
    open();
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 190, animated: true });
    close();

    // Taller: 710 + 8 + 50 + 12 - 538 = 242.
    result.current.onRingsLayout(layout(310, 400));
    open();
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 242, animated: true });
  });

  it('counts every block under the spacer', () => {
    const { result, scrollTo, open } = setup(12);
    result.current.onAnchorLayout(layout(100, 50));
    result.current.onRingsLayout(layout(160, 500));
    result.current.belowLayout('label')(layout(0, 26));
    result.current.belowLayout('cta')(layout(0, 50));
    open();
    // 660 + 12 + 26 + 50 + 12 - 538 = 222.
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 222, animated: true });
  });

  it('lets the CTAs go under the keypad rather than push the focused ring off the top', () => {
    const { result, scrollTo, open } = setup(12);
    // Breakdown: five rings, the first one (Sets) focused near the top.
    focus(420);
    result.current.onAnchorLayout(layout(330, 50));
    result.current.onRingsLayout(layout(390, 800));
    result.current.belowLayout('cta')(layout(0, 50));
    open();
    // The CTAs alone would want 1190 + 12 + 50 + 12 - 538 = 726; the Sets
    // number may only rise to 60 + 40 from the top: 420 - 100 = 320.
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 320, animated: true });
  });

  it('still lifts a low focused ring clear of the keypad', () => {
    const { result, scrollTo, open } = setup(12);
    focus(700);
    result.current.onAnchorLayout(layout(100, 50));
    open();
    // 700 + 60 + 12 - 538 = 234, past the date's 40.
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 234, animated: true });
  });

  it('waits for a focus that lands after the keyboard event', () => {
    const { result, scrollTo } = setup(12);
    result.current.onAnchorLayout(layout(330, 50));
    result.current.onRingsLayout(layout(390, 800));
    result.current.belowLayout('cta')(layout(0, 50));
    // The keyboard event arrives with no field focused yet...
    const listeners = (Keyboard.addListener as jest.Mock).mock.calls;
    const willShow = listeners.find(([name]) => name === 'keyboardWillShow')![1] as Listener;
    act(() => willShow({ endCoordinates: { height: 336, screenY: 538, screenX: 0, width: 402 } }));
    expect(scrollTo).not.toHaveBeenCalled();
    // ...then the Sets field's focus bubbles up to the rings.
    focus(420);
    act(() => result.current.onFieldFocus());
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 320, animated: true });
    // The fallback does not override it.
    act(() => jest.advanceTimersByTime(200));
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('ignores a repeated keyboard event while the keypad is up', () => {
    const { result, scrollTo, open } = setup(8);
    result.current.onAnchorLayout(layout(250, 50));
    open();
    open();
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });
});
