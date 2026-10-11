import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackArrow } from '../src/components/Chrome';
import { useAuth } from '../src/auth';
import {
  confirmCheckoutSession,
  createBillingPortal,
  createCheckoutSession,
  getSubscription,
  type PaidTier,
  type SubscriptionSnapshot,
} from '../src/lib/billing';
import { colors } from '../src/theme';

type NativeWebView = typeof import('react-native-webview').default;
const WebView: NativeWebView | null = Platform.OS === 'web'
  ? null
  : require('react-native-webview').default;

function selectedTier(value: string | string[] | undefined): PaidTier {
  return value === 'premium' ? 'premium' : 'basic';
}

export default function Subscribe() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tier?: string; stripe_checkout?: string; session_id?: string }>();
  const { reloadProfile } = useAuth();
  const tier = selectedTier(params.tier);
  const returnUrl = useMemo(() => Linking.createURL('subscribe'), []);
  const [subscription, setSubscription] = useState<SubscriptionSnapshot | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(
    typeof params.session_id === 'string' ? params.session_id : null,
  );
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    params.stripe_checkout === 'cancel' ? 'Checkout was cancelled. No payment was made.' : null,
  );
  const confirmedSessions = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    setBusy(true);
    const result = await getSubscription();
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSubscription(result.data?.subscription ?? null);
    reloadProfile();
  }, [reloadProfile]);

  useEffect(() => { void refresh(); }, [refresh]);

  const confirmCheckout = useCallback(async (sessionId: string) => {
    if (confirmedSessions.current.has(sessionId)) return;
    setBusy(true);
    setError(null);
    const result = await confirmCheckoutSession(sessionId);
    setBusy(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.data?.confirmed && result.data.subscription) {
      confirmedSessions.current.add(sessionId);
      setCheckoutUrl(null);
      setSubscription(result.data.subscription);
      setNotice('Payment confirmed. Your TEI membership is now active.');
      reloadProfile();
      return;
    }

    setNotice('Payment is still being confirmed. Please wait a moment, then tap Check payment status.');
  }, [reloadProfile]);

  useEffect(() => {
    if (params.stripe_checkout !== 'success' || typeof params.session_id !== 'string') return;
    setCheckoutSessionId(params.session_id);
    void confirmCheckout(params.session_id);
  }, [confirmCheckout, params.session_id, params.stripe_checkout]);

  async function openCheckout() {
    setBusy(true);
    setError(null);
    const result = await createCheckoutSession(tier, returnUrl, returnUrl);
    setBusy(false);
    if (result.error || !result.data?.checkoutUrl) {
      setError(result.error ?? 'Stripe did not return a checkout page.');
      return;
    }
    setCheckoutSessionId(result.data.sessionId);
    if (Platform.OS === 'web') {
      window.location.assign(result.data.checkoutUrl);
      return;
    }
    setCheckoutUrl(result.data.checkoutUrl);
  }

  async function openPortal() {
    setBusy(true);
    setError(null);
    const result = await createBillingPortal(returnUrl);
    setBusy(false);
    if (result.error || !result.data?.portalUrl) {
      setError(result.error ?? 'Stripe did not return a billing page.');
      return;
    }
    if (Platform.OS === 'web') {
      window.location.assign(result.data.portalUrl);
      return;
    }
    setCheckoutUrl(result.data.portalUrl);
  }

  function returnedToApp(url: string) {
    if (!url.startsWith(returnUrl)) return false;
    setCheckoutUrl(null);
    if (url.includes('stripe_checkout=success')) {
      const sessionId = new URL(url).searchParams.get('session_id') ?? checkoutSessionId;
      setNotice('Payment received. Confirming your membership…');
      if (sessionId) {
        setCheckoutSessionId(sessionId);
        void confirmCheckout(sessionId);
      }
    } else {
      setNotice('Checkout was cancelled. No payment was made.');
    }
    return true;
  }

  if (checkoutUrl && WebView) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
        <View style={styles.checkoutHeader}>
          <BackArrow
            onPress={() => {
              setCheckoutUrl(null);
              if (checkoutSessionId) void confirmCheckout(checkoutSessionId);
            }}
            color={colors.orange}
          />
          <Text style={styles.checkoutTitle}>Secure Stripe Checkout</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Check payment status"
            disabled={!checkoutSessionId || busy}
            onPress={() => checkoutSessionId && void confirmCheckout(checkoutSessionId)}
            style={styles.statusButton}
          >
            <Text style={styles.statusButtonText}>{busy ? 'Checking…' : 'Check status'}</Text>
          </Pressable>
        </View>
        <WebView
          source={{ uri: checkoutUrl }}
          onShouldStartLoadWithRequest={(request) => !returnedToApp(request.url)}
          onNavigationStateChange={(state) => { returnedToApp(state.url); }}
          startInLoadingState
          renderLoading={() => <ActivityIndicator style={{ marginTop: 30 }} color={colors.orange} />}
        />
      </View>
    );
  }

  const hasSubscription = subscription && ['active', 'trialing', 'past_due'].includes(subscription.status);
  const tierName = tier === 'basic' ? 'Basic' : 'Premium';
  const price = tier === 'basic' ? '$5 / month' : '$11 / month';

  return (
    <View style={[styles.page, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 24 }]}>
      <BackArrow onPress={() => router.back()} color={colors.orange} />
      <Text style={styles.kicker}>TEI MEMBERSHIP</Text>
      <Text style={styles.title}>{hasSubscription ? 'Manage Billing' : `TEI ${tierName}`}</Text>
      {busy ? <ActivityIndicator color={colors.orange} size="large" style={{ marginTop: 32 }} /> : (
        <>
          {hasSubscription ? (
            <Text style={styles.copy}>
              Your TEI {subscription.tier === 'basic' ? 'Basic' : 'Premium'} subscription is {subscription.status.replace('_', ' ')}.
              {subscription.cancel_at_period_end ? ' It will end at the close of the current period.' : ''}
            </Text>
          ) : (
            <Text style={styles.copy}>
              Subscribe to TEI {tierName} for {price}. Your debit or credit card is entered only on Stripe’s secure checkout page.
            </Text>
          )}
          {notice && <Text style={styles.notice}>{notice}</Text>}
          {error && <Text style={styles.error}>{error}</Text>}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hasSubscription ? 'Manage billing with Stripe' : `Subscribe to TEI ${tierName}`}
            onPress={hasSubscription ? openPortal : openCheckout}
            style={styles.button}
          >
            <Text style={styles.buttonText}>{hasSubscription ? 'Manage billing' : `Continue to secure payment — ${price}`}</Text>
          </Pressable>
          <Text style={styles.finePrint}>Payments, cards, cancellations, and invoices are managed by Stripe.</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#2E2E2E', paddingHorizontal: 24 },
  kicker: { color: colors.orange, fontSize: 14, fontWeight: '700', letterSpacing: 1.2, marginTop: 48 },
  title: { color: '#fff', fontSize: 42, fontWeight: '600', marginTop: 8 },
  copy: { color: '#e7e7e7', fontSize: 18, lineHeight: 27, marginTop: 20 },
  notice: { color: '#A8E66E', fontSize: 16, lineHeight: 23, marginTop: 18 },
  error: { color: '#ff9b9b', fontSize: 16, lineHeight: 23, marginTop: 18 },
  button: { backgroundColor: '#fff', marginTop: 30, paddingVertical: 17, paddingHorizontal: 18 },
  buttonText: { color: '#1d1d1d', fontSize: 17, fontWeight: '700', textAlign: 'center' },
  finePrint: { color: '#b8b8b8', fontSize: 13, lineHeight: 19, marginTop: 14, textAlign: 'center' },
  checkoutHeader: { alignItems: 'center', flexDirection: 'row', paddingHorizontal: 18, paddingVertical: 12 },
  checkoutTitle: { color: '#222', flex: 1, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  statusButton: { marginLeft: 10, minWidth: 80 },
  statusButtonText: { color: colors.orange, fontSize: 12, fontWeight: '700', textAlign: 'right' },
});
