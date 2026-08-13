import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Dimensions, View } from 'react-native';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/auth';
import { StoreProvider, useStore } from '../src/store';
import { Toast } from '../src/components/Chrome';
import { colors } from '../src/theme';

const { width, height } = Dimensions.get('window');

const FALLBACK_METRICS = {
  frame: { x: 0, y: 0, width, height },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/** Routes reachable without a session. Everything else requires sign-in. */
const PUBLIC_ROUTES = new Set([
  'index',
  'login',
  'account-type',
  'create-account',
]);

export default function RootLayout() {
  return (
    // `initialMetrics` is required here: without it the provider defers its
    // first render until it has measured insets, which never resolves on web
    // and leaves the whole tree blank. `initialWindowMetrics` is itself null
    // on web, so fall back to zero insets.
    <SafeAreaProvider initialMetrics={initialWindowMetrics ?? FALLBACK_METRICS}>
      <AuthProvider>
        <StoreProvider>
          <StatusBar style="light" />
          <AuthGate />
          <GlobalToast />
        </StoreProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

/**
 * Keeps the visible route in sync with auth state: signed-out users are sent
 * back to the launch screen, and signed-in users are pushed past onboarding.
 */
function AuthGate() {
  const { session, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;

    // segments[0] is undefined on the index route.
    const current: string = segments[0] ?? 'index';
    const onPublicRoute = PUBLIC_ROUTES.has(current);

    if (!session && !onPublicRoute) {
      router.replace('/');
    } else if (session && onPublicRoute && current !== 'index') {
      // Finished signing in or signing up — continue into the app.
      router.replace('/home');
    }
  }, [session, initializing, segments, router]);

  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.orange} size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
      }}
    />
  );
}

function GlobalToast() {
  const { toast } = useStore();
  if (!toast) return null;
  return <Toast message={toast} />;
}
