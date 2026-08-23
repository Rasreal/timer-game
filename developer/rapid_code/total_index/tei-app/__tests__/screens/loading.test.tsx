import { act, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderScreen } from '../helpers/render';

jest.mock('../../src/lib/supabase', () => ({ supabase: {} }));

import LoadingScreen from '../../app/loading';

describe('app/loading.tsx — App Loading Screen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renders without crashing', () => {
    expect(() => renderScreen(<LoadingScreen />)).not.toThrow();
  });

  it('renders the rhino mark and the TEI wordmark', () => {
    renderScreen(<LoadingScreen />);
    expect(screen.getByLabelText('Rhino Athletics')).toBeTruthy();
    expect(screen.getByText('TEI')).toBeTruthy();
  });

  it('renders the animated progress indicator (track + sweeping bar)', () => {
    renderScreen(<LoadingScreen />);

    // The indicator is an Animated.View over a 2px track; neither has a
    // testID, so it is identified structurally by its orange absolute style.
    const animated = screen.UNSAFE_root.findAll((node) => {
      const style = node.props?.style;
      const flat = Array.isArray(style) ? Object.assign({}, ...style.flat(2)) : style;
      return !!flat && flat.position === 'absolute' && flat.backgroundColor === '#FF8A25';
    });
    expect(animated.length).toBeGreaterThan(0);
  });

  it('does not navigate immediately', () => {
    renderScreen(<LoadingScreen />);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('replaces to /home after the 1800ms hold', () => {
    renderScreen(<LoadingScreen />);

    act(() => {
      jest.advanceTimersByTime(1799);
    });
    expect(router.replace).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(router.replace).toHaveBeenCalledWith('/home');
  });

  it('clears its timer on unmount so it cannot navigate after teardown', () => {
    const view = renderScreen(<LoadingScreen />);

    view.unmount();
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(router.replace).not.toHaveBeenCalled();
  });
});
