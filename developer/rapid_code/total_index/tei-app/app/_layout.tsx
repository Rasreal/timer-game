import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import { Dimensions } from 'react-native';
import { StoreProvider, useStore } from '../src/store';
import { Toast } from '../src/components/Chrome';
import { colors } from '../src/theme';

const { width, height } = Dimensions.get('window');

const FALLBACK_METRICS = {
  frame: { x: 0, y: 0, width, height },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

export default function RootLayout() {
  return (
    // `initialMetrics` is required here: without it the provider defers its
    // first render until it has measured insets, which never resolves on web
    // and leaves the whole tree blank. `initialWindowMetrics` is itself null
    // on web, so fall back to zero insets.
    <SafeAreaProvider initialMetrics={initialWindowMetrics ?? FALLBACK_METRICS}>
      <StoreProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'slide_from_right',
          }}
        />
        <GlobalToast />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

function GlobalToast() {
  const { toast } = useStore();
  if (!toast) return null;
  return <Toast message={toast} />;
}
