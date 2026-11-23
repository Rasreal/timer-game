import { act, render, screen } from '@testing-library/react-native';
import { Keyboard, ScrollView, Text, TextInput } from 'react-native';
import { KeyboardAwareScrollView } from '../../src/components/KeyboardAware';
import { TrainingScale } from '../../src/components/TrainingScale';
import { bigNumberSize } from '../../app/calculator';

jest.mock('../../src/lib/supabase');

type Listener = (e: unknown) => void;

/** Captures Keyboard listeners so a test can open and close the keyboard. */
function captureKeyboard() {
  const listeners: Record<string, Listener[]> = {};
  jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, cb: Listener) => {
    (listeners[event] ??= []).push(cb);
    return { remove: jest.fn() };
  }) as never);
  return (event: string, payload?: unknown) => listeners[event]?.forEach((cb) => cb(payload));
}

function flatten(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return style.reduce((acc, s) => ({ ...acc, ...flatten(s) }), {});
  return (style as Record<string, unknown>) ?? {};
}

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('KeyboardAwareScrollView', () => {
  // The jest preset is iOS, so the "will" events drive it.
  const OPEN = {
    endCoordinates: { height: 300, screenY: 544, screenX: 0, width: 390 },
  };

  it('pads the content by the keyboard height while it is open', () => {
    const emit = captureKeyboard();
    render(
      <KeyboardAwareScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <Text>Form</Text>
      </KeyboardAwareScrollView>,
    );
    const scroll = () => screen.UNSAFE_getByType(ScrollView);
    expect(flatten(scroll().props.contentContainerStyle).paddingBottom).toBe(20);

    act(() => emit('keyboardWillShow', OPEN));
    expect(flatten(scroll().props.contentContainerStyle).paddingBottom).toBe(300 + 24);

    act(() => emit('keyboardWillHide'));
    expect(flatten(scroll().props.contentContainerStyle).paddingBottom).toBe(20);
  });

  it('scrolls a focused field that the keyboard would cover into view', () => {
    jest.useFakeTimers();
    const emit = captureKeyboard();
    // A field whose bottom sits at 600 + 50 = 650, under a keyboard topping out at 544.
    jest.spyOn(TextInput.State, 'currentlyFocusedInput').mockReturnValue({
      measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => cb(0, 600, 300, 50),
    } as never);
    const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {});

    render(
      <KeyboardAwareScrollView extraGap={10}>
        <TextInput />
      </KeyboardAwareScrollView>,
    );
    act(() => emit('keyboardWillShow', OPEN));
    act(() => jest.runAllTimers());

    // 650 + 24 gap + 10 extra - 544 = 140
    expect(scrollTo).toHaveBeenCalledWith({ y: 140, animated: true });
  });

  it('leaves the scroll alone when the focused field is already above the keyboard', () => {
    jest.useFakeTimers();
    const emit = captureKeyboard();
    jest.spyOn(TextInput.State, 'currentlyFocusedInput').mockReturnValue({
      measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => cb(0, 200, 300, 50),
    } as never);
    const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {});

    render(
      <KeyboardAwareScrollView>
        <TextInput />
      </KeyboardAwareScrollView>,
    );
    act(() => emit('keyboardWillShow', OPEN));
    act(() => jest.runAllTimers());

    expect(scrollTo).not.toHaveBeenCalled();
  });
});

describe('big orange number size', () => {
  it('starts at 200 before the width is known', () => {
    expect(bigNumberSize(0)).toBe(200);
  });

  it('fits two digits in the width available, capped at 200', () => {
    expect(bigNumberSize(220)).toBe(175);
    expect(bigNumberSize(400)).toBe(200);
  });

  it('never goes below 80 on a very narrow screen', () => {
    expect(bigNumberSize(50)).toBe(80);
  });
});

describe('training chart fills the page', () => {
  it('grows its rows to fill the height and paints the strip under them', () => {
    render(<TrainingScale step={16} fillHeight={900} bleed={34} />);
    // Headings first report their height; rows then share what is left.
    act(() => {
      screen
        .getByTestId('training-chart')
        .findAll((n) => typeof n.props.onLayout === 'function' && n !== screen.getByTestId('training-chart'))[0]
        .props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 380, height: 26 } } });
    });
    const bleed = screen.getByTestId('training-chart-bleed');
    expect(flatten(bleed.props.style).height).toBe(34);
  });

  it('keeps the minimum row height and no strip without fillHeight', () => {
    render(<TrainingScale step={16} />);
    expect(screen.queryByTestId('training-chart-bleed')).toBeNull();
  });
});
