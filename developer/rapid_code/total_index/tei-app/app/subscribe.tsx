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
  PremiumWaitlistForm,
  WAITLIST_YELLOW,
} from '../src/components/PremiumWaitlist';
import {
  changeSubscription,
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

function periodEndLabel(value: string | null): string {
  if (!value || Number.isNaN(new Date(value).getTime())) return 'the end of the current billing period';
  return new Intl.DateTimeFormat('en', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(value));
}

export default function Subscribe() {
  const params = useLocalSearchParams<{ tier?: string; change?: string; stripe_checkout?: string }>();
  if (params.change === 'elemental') return <SwitchToElemental />;
  // A Checkout started before Premium was paused may still return here, and
  // must still be confirmed.
  if (params.tier === 'premium' && !params.stripe_checkout) return <PremiumInDevelopment />;
  return <Checkout />;
}

/**
 * Downgrade to the free tier. Cancelling keeps the paid tier until the end of
 * the period already paid for; the Stripe webhook then moves the account to
 * Elemental. Until then the user can change their mind.
 */
function SwitchToElemental() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, reloadProfile } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionSnapshot | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void getSubscription().then((result) => {
      if (!live) return;
      setBusy(false);
      if (result.error) setError(result.error);
      else setSubscription(result.data?.subscription ?? null);
    });
    return () => { live = false; };
  }, []);

  const live = subscription && ['active', 'trialing', 'past_due'].includes(subscription.status);
  const paidName = (live ? subscription.tier : profile?.tier) === 'premium' ? 'Premium' : 'Basic';
  const endsOn = periodEndLabel(subscription?.current_period_end ?? null);
  const scheduled = Boolean(live && subscription.cancel_at_period_end);
  const onElemental = profile?.tier === 'elemental' && !live;

  async function change(action: 'cancel' | 'resume') {
    setBusy(true);
    setError(null);
    const result = await changeSubscription(action);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSubscription(result.data?.subscription ?? null);
    reloadProfile();
    if (action === 'resume') setNotice(`You’re staying on TEI ${paidName}.`);
    else if (result.data?.subscription) {
      setNotice(`Done. TEI ${paidName} stays active until ${endsOn}, then your account moves to TEI Elemental.`);
    } else setNotice('Done. You’re now on TEI Elemental.');
  }

  let copy: string;
  if (onElemental) copy = 'You’re on TEI Elemental, the free TEI.';
  else if (scheduled) {
    copy = `Your switch to TEI Elemental is scheduled. TEI ${paidName} stays active until ${endsOn}, and you won’t be charged again.`;
  } else if (live) {
    copy = `TEI Elemental is free. Switching cancels your TEI ${paidName} subscription: you keep ${paidName} until ${endsOn}, then your account moves to Elemental and you won’t be charged again. Your saved sessions stay in your account.`;
  } else {
    copy = 'TEI Elemental is free. Switching takes effect straight away. Your saved sessions stay in your account.';
  }

  return (
    <View style={[styles.page, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 24 }]}>
      <BackArrow onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))} color={colors.orange} />
      <Text style={styles.kicker}>TEI MEMBERSHIP</Text>
      <Text style={styles.title}>Switch to TEI Elemental</Text>
      {busy && !notice ? <ActivityIndicator color={colors.orange} size="large" style={{ marginTop: 32 }} /> : (
        <>
          <Text style={styles.copy}>{copy}</Text>
          {notice && <Text style={styles.notice}>{notice}</Text>}
          {error && <Text style={styles.error}>{error}</Text>}
          {!onElemental && (
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void change(scheduled ? 'resume' : 'cancel')}
              style={styles.button}
            >
              <Text style={styles.buttonText}>
                {busy ? 'Working…' : scheduled ? `Keep TEI ${paidName}` : 'Switch to Elemental'}
              </Text>
            </Pressable>
          )}
          <Pressable accessibilityRole="button" onPress={() => router.replace('/home')} style={styles.secondary}>
            <Text style={styles.secondaryText}>Back to Home</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

/** Premium is not on sale yet; anyone who reaches its checkout gets the waitlist. */
function PremiumInDevelopment() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showForm, setShowForm] = useState(false);
  const [joined, setJoined] = useState(false);

  return (
    <View style={[styles.page, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 24 }]}>
      <BackArrow onPress={() => (router.canGoBack() ? router.back() : router.replace('/account-type'))} color={colors.orange} />
      <Text style={styles.kicker}>TEI MEMBERSHIP</Text>
      <Text style={styles.title}>TEI Premium</Text>
      <Text style={styles.copy}>
        TEI Premium is in development. Join the waitlist and we’ll let you know as soon as it’s ready.
      </Text>
      {joined && <Text style={styles.notice}>You’re on the TEI Premium waitlist.</Text>}
      <Pressable
        accessibilityRole="button"
        onPress={() => (joined ? router.replace('/account-type') : setShowForm(true))}
        style={[styles.button, { backgroundColor: WAITLIST_YELLOW }]}
      >
        <Text style={styles.buttonText}>{joined ? 'Pick a TEI for now' : 'Join the WAITLIST'}</Text>
      </Pressable>
      {showForm && (
        <PremiumWaitlistForm
          onClose={() => setShowForm(false)}
          onSent={() => {
            setShowForm(false);
            setJoined(true);
          }}
        />
      )}
    </View>
  );
}

function Checkout() {
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
    } else if (url.includes('stripe_checkout=cancel')) {
      setNotice('Checkout was cancelled. No payment was made.');
    } else {
      // The Stripe Billing Portal returns to the same deep link without a
      // Checkout marker. Refresh so cancellation-at-period-end and other
      // billing changes are visible as soon as the portal closes.
      setNotice('Billing settings updated. Refreshing your membership…');
      void refresh();
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
  const cancellationEnd = subscription?.cancel_at_period_end
    ? periodEndLabel(subscription.current_period_end)
    : null;

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
              {cancellationEnd ? ` It will end on ${cancellationEnd}.` : ''}
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
  secondary: { alignSelf: 'center', marginTop: 22, padding: 6 },
  secondaryText: { color: '#b8b8b8', fontSize: 16 },
  finePrint: { color: '#b8b8b8', fontSize: 13, lineHeight: 19, marginTop: 14, textAlign: 'center' },
  checkoutHeader: { alignItems: 'center', flexDirection: 'row', paddingHorizontal: 18, paddingVertical: 12 },
  checkoutTitle: { color: '#222', flex: 1, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  statusButton: { marginLeft: 10, minWidth: 80 },
  statusButtonText: { color: colors.orange, fontSize: 12, fontWeight: '700', textAlign: 'right' },
});
