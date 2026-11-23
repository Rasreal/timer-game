/**
 * src/components/Tour.tsx — the first-time "thought bubble" tour from Ken's
 * 11 Nov 2026 edits.
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetTours, useTour, type TourStep } from '../src/components/Tour';
import { TOURS } from '../src/lib/tours';

jest.mock('../src/auth', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } } }),
}));

const STEPS: TourStep[] = [
  { target: 'a', text: 'First tip' },
  { target: 'missing', text: 'Never shown' },
  { target: 'b', text: 'Second tip' },
];

/** A stand-in for a native view: measureInWindow reports a fixed frame. */
function Target({ name, y, tour }: { name: string; y: number; tour: ReturnType<typeof useTour> }) {
  return (
    <View
      ref={(node) => {
        if (node) {
          (node as unknown as { measureInWindow: unknown }).measureInWindow = (
            cb: (x: number, y: number, w: number, h: number) => void,
          ) => cb(20, y, 100, 40);
        }
        tour.target(name)(node);
      }}
    />
  );
}

function Screen({ steps = STEPS }: { steps?: TourStep[] }) {
  const tour = useTour('demo', steps);
  return (
    <View>
      <Target name="a" y={100} tour={tour} />
      <Target name="b" y={600} tour={tour} />
      <Text>Screen</Text>
      {tour.overlay}
    </View>
  );
}

/** Let AsyncStorage answer, wait out the start delay, and lay out the overlay. */
async function start() {
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    jest.advanceTimersByTime(800);
  });
  const backdrop = await screen.findByTestId('tour-backdrop');
  act(() => {
    fireEvent(backdrop, 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 844 } },
    });
  });
}

beforeEach(async () => {
  (globalThis as { __TEI_DISABLE_TOURS__?: boolean }).__TEI_DISABLE_TOURS__ = false;
  await AsyncStorage.clear();
  jest.useFakeTimers();
});

afterEach(() => {
  (globalThis as { __TEI_DISABLE_TOURS__?: boolean }).__TEI_DISABLE_TOURS__ = true;
  jest.useRealTimers();
});

describe('first-time tour', () => {
  it('walks through the steps, skipping a missing target, and remembers it', async () => {
    render(<Screen />);
    await start();
    expect(screen.getByText('First tip')).toBeTruthy();
    expect(screen.getByText('1 of 3', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByLabelText('First tip Tip 1 of 3.')).toBeTruthy();

    fireEvent.press(screen.getByTestId('tour-bubble'));
    act(() => {
      fireEvent(screen.getByTestId('tour-backdrop'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 844 } },
      });
    });
    expect(screen.queryByText('Never shown')).toBeNull();
    expect(screen.getByText('Second tip')).toBeTruthy();
    // The last tip has no Skip link.
    expect(screen.queryByText('Skip tour')).toBeNull();

    fireEvent.press(screen.getByTestId('tour-bubble'));
    expect(screen.queryByTestId('tour-backdrop')).toBeNull();
    await waitFor(async () =>
      expect(await AsyncStorage.getItem('tei.tour.v1:user-1:demo')).toBe('1'),
    );
  });

  it('ends the tour from Skip tour', async () => {
    render(<Screen />);
    await start();
    fireEvent.press(screen.getByLabelText('Skip tour'));
    expect(screen.queryByTestId('tour-backdrop')).toBeNull();
    await waitFor(async () =>
      expect(await AsyncStorage.getItem('tei.tour.v1:user-1:demo')).toBe('1'),
    );
  });

  it('does not show again once seen, until it is reset', async () => {
    await AsyncStorage.setItem('tei.tour.v1:user-1:demo', '1');
    await AsyncStorage.setItem('tei.tour.v1:someone-else:demo', '1');
    const { unmount } = render(<Screen />);
    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(800);
    });
    expect(screen.queryByTestId('tour-backdrop')).toBeNull();
    unmount();

    await resetTours('user-1');
    expect(await AsyncStorage.getItem('tei.tour.v1:user-1:demo')).toBeNull();
    // Another account's progress is untouched.
    expect(await AsyncStorage.getItem('tei.tour.v1:someone-else:demo')).toBe('1');

    render(<Screen />);
    await start();
    expect(screen.getByText('First tip')).toBeTruthy();
  });

  it('places the bubble under a high target and over a low one', async () => {
    render(<Screen steps={[STEPS[2]]} />);
    await start();
    // Target b sits at y 600 of 844, so the bubble hangs above it.
    const style = [screen.getByTestId('tour-bubble-wrap').props.style]
      .flat(3)
      .reduce((acc, s) => ({ ...acc, ...s }), {});
    expect(style.bottom).toBe(844 - 600 + 10);
    expect(style.top).toBeUndefined();
  });
});

describe('tour copy', () => {
  it("keeps Ken's own words for the calculator and the chart", () => {
    expect(TOURS.calculator.map((s) => s.text)).toContain(
      'Tap any three dots for more information.',
    );
    expect(TOURS.trainingScale[0].text).toBe('Tap any “i” for more information.');
  });
});
