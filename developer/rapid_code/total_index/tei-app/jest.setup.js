/* global jest */
process.env.EXPO_PUBLIC_SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => {
  const router = {
    push: jest.fn(), replace: jest.fn(), back: jest.fn(),
    navigate: jest.fn(), dismissAll: jest.fn(), setParams: jest.fn(),
  };
  const React = require('react');
  // Screens currently using useFocusEffect; __refocus() re-runs their callbacks.
  const focusListeners = new Set();
  return {
    router,
    useRouter: () => router,
    useLocalSearchParams: jest.fn(() => ({})),
    useSegments: jest.fn(() => []),
    usePathname: jest.fn(() => '/'),
    // The real hook runs its callback on mount AND every time the screen
    // regains focus. A bare jest.fn() never invokes it at all, so any screen
    // that loads its data on focus would render empty forever under test.
    // `focusCount` lets a test simulate navigating back to a still-mounted
    // screen: bump it via __refocus() and the callback runs again, exactly as
    // returning from a pushed route would.
    useFocusEffect: (cb) => {
      const [focusCount, setFocusCount] = React.useState(0);
      React.useEffect(() => {
        focusListeners.add(setFocusCount);
        return () => focusListeners.delete(setFocusCount);
      }, []);
      React.useEffect(cb, [cb, focusCount]);
    },
    Link: ({ children }) => children,
    Stack: Object.assign(({ children }) => children, {
      Screen: () => null,
    }),
    Slot: ({ children }) => children,
    Redirect: () => null,
    __router: router,
    __refocus: () => focusListeners.forEach((set) => set((n) => n + 1)),
  };
});

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});

jest.mock('@react-native-community/slider', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View };
});

jest.spyOn(console, 'error').mockImplementation((...a) => {
  const m = String(a[0] ?? '');
  if (m.includes('not wrapped in act') || m.includes('useNativeDriver')) return;
});
