import type { ReactElement, ReactNode } from 'react';
import { render, type RenderResult } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider } from '../../src/store';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={METRICS}>
      <StoreProvider>{children}</StoreProvider>
    </SafeAreaProvider>
  );
}

/**
 * Shared provider wrapper for the onboarding/auth screens.
 *
 * `../../src/auth` is jest.mock()'d by the individual test files (so `useAuth`
 * hands back controllable spies); this helper supplies the real StoreProvider
 * (pendingTier / showToast) plus safe-area metrics.
 */
export function renderScreen(ui: ReactElement): RenderResult {
  return render(<Providers>{ui}</Providers>);
}
