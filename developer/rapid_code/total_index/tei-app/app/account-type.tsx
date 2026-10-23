import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BackArrow,
  Divider,
  Ellipsis,
  OutlineButton,
} from '../src/components/Chrome';
import {
  InDevelopmentBadge,
  PremiumWaitlistForm,
  WAITLIST_YELLOW,
} from '../src/components/PremiumWaitlist';
import { useAuth } from '../src/auth';
import { useStore, type Tier } from '../src/store';
import { colors, useAccent } from '../src/theme';

function label(t: Tier): string {
  return t === 'elemental' ? 'Elemental' : t === 'basic' ? 'Basic' : 'Premium';
}

/** Screen 5 — Account Type Selection, and the upgrade/downgrade screen. */
export default function AccountType() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setPendingTier, showToast } = useStore();
  const { session, profile } = useAuth();
  const [showFeatures, setShowFeatures] = useState(false);
  // Premium is in development, so choosing it opens the WAITLIST form over
  // whichever surface offered it (this screen or "The 3 TEI" sheet).
  const [waitlistOver, setWaitlistOver] = useState<'screen' | 'sheet' | null>(null);
  const accent = useAccent();

  // Two modes: picking a tier during sign-up, or switching tier afterwards.
  const signedIn = session != null;
  const currentTier = signedIn ? profile?.tier : undefined;

  function waitlistSent() {
    setWaitlistOver(null);
    showToast('You’re on the TEI Premium waitlist. Pick a TEI for now.');
  }

  async function choose(tier: Tier) {
    if (tier === 'premium' && currentTier !== 'premium') {
      setWaitlistOver(showFeatures ? 'sheet' : 'screen');
      return;
    }

    setShowFeatures(false);

    if (!signedIn) {
      setPendingTier(tier);
      router.push('/create-account');
      return;
    }

    if (profile?.tier === tier) {
      showToast(`You are already on TEI ${label(tier)}.`);
      return;
    }

    if (tier === 'elemental') {
      router.push('/subscribe?change=elemental' as never);
      return;
    }
    router.push(`/subscribe?tier=${tier}` as never);
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#2E2E2E' }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 22,
          paddingBottom: Math.max(insets.bottom, 20) + 24,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <BackArrow onPress={() => router.canGoBack() ? router.back() : router.replace('/home')} />
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={styles.tei1}>TOTAL EFFECT INDEX</Text>
            <Text style={[styles.tei2, { color: accent }]}>TEI</Text>
          </View>
        </View>

        <Text style={styles.question}>
          What kind of training information do you want{' '}
          <Text style={{ fontWeight: '700', color: colors.text }}>TEI</Text> to
          provide?
        </Text>

        {signedIn && currentTier && (
          <Text style={[styles.switchNote, { color: accent }]}>
            You’re on TEI {label(currentTier)}. Tap another plan to switch.
          </Text>
        )}

        <TierRow
          label="Helpful"
          current={profile?.tier === 'elemental'}
          busy={false}
          subPrefix="TEI"
          subText=" Elemental - FREE"
          onSelect={() => choose('elemental')}
          onEllipsis={() => setShowFeatures(true)}
        />
        <Divider style={{ marginVertical: 24, marginHorizontal: 34 }} />
        <TierRow
          label="Insightful"
          current={profile?.tier === 'basic'}
          busy={false}
          subPrefix="TEI"
          subText=" Basic - $5 per month"
          onSelect={() => choose('basic')}
          onEllipsis={() => setShowFeatures(true)}
        />
        <Divider style={{ marginVertical: 24, marginHorizontal: 34 }} />
        {/* Premium is in development: the yellow row offers the WAITLIST.
            Accounts already on Premium keep seeing it as their plan. */}
        <TierRow
          label="Transformative"
          current={currentTier === 'premium'}
          busy={false}
          subPrefix="TEI"
          subText=" Premium - "
          subEmphasis="WAITLIST"
          highlight={currentTier === 'premium' ? undefined : WAITLIST_YELLOW}
          onSelect={() => choose('premium')}
          onEllipsis={() => setShowFeatures(true)}
        />
      </ScrollView>

      {waitlistOver === 'screen' && (
        <Modal
          visible
          animationType="slide"
          transparent
          onRequestClose={() => setWaitlistOver(null)}
        >
          <PremiumWaitlistForm
            onClose={() => setWaitlistOver(null)}
            onSent={waitlistSent}
          />
        </Modal>
      )}

      <Modal
        visible={showFeatures}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFeatures(false)}
      >
        <TheThreeTei onClose={() => setShowFeatures(false)} onChoose={choose} />
        {/* Drawn inside the sheet's Modal rather than as a second Modal, so
            sending returns the user to the sheet underneath. */}
        {waitlistOver === 'sheet' && (
          <PremiumWaitlistForm
            onClose={() => setWaitlistOver(null)}
            onSent={waitlistSent}
          />
        )}
      </Modal>
    </View>
  );
}

function TierRow({
  label,
  subPrefix,
  subText,
  subEmphasis,
  highlight,
  onSelect,
  onEllipsis,
  current = false,
  busy = false,
}: {
  label: string;
  subPrefix: string;
  subText: string;
  /** Bold tail of the subline, e.g. "WAITLIST". */
  subEmphasis?: string;
  /** Outline and subline colour that sets this row apart (Premium's yellow). */
  highlight?: string;
  onSelect: () => void;
  onEllipsis: () => void;
  /** True when this is the signed-in user's active plan. */
  current?: boolean;
  busy?: boolean;
}) {
  const accent = useAccent();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Ellipsis
        onPress={onEllipsis}
        color={accent}
        label={`More about ${label}`}
      />
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Pressable
          onPress={onSelect}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.pill,
            { backgroundColor: pressed ? '#4a4a4a' : '#3A3A3A' },
            highlight != null && { borderColor: highlight },
            current && [styles.pillCurrent, { borderColor: accent }],
          ]}
        >
          <Text style={styles.pillText}>
            {busy ? '…' : label}
            {current && !busy && <Text style={[styles.pillCurrentTag, { color: accent }]}>  ✓</Text>}
          </Text>
        </Pressable>
        <Text style={[styles.pillSub, highlight != null && { color: highlight }]}>
          <Text style={{ fontWeight: '700' }}>{subPrefix}</Text>
          {subText}
          {subEmphasis && (
            <Text style={{ fontWeight: '800', letterSpacing: 0.6 }}>{subEmphasis}</Text>
          )}
        </Text>
      </View>
    </View>
  );
}

/** Screen 6 — "The 3 TEI" account-type features micro-screen. */
function TheThreeTei({
  onClose,
  onChoose,
}: {
  onClose: () => void;
  onChoose: (t: Tier) => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <View style={styles.sheet}>
        <ScrollView
          contentContainerStyle={{
            padding: 22,
            paddingBottom: Math.max(insets.bottom, 20) + 24,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={styles.sheetTitle}>The 3 TEI</Text>
              <Text style={styles.sheetSub}>Which one is for YOU?</Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={14}
            >
              <Text style={{ color: colors.orange, fontSize: 28, fontWeight: '300' }}>
                ✕
              </Text>
            </Pressable>
          </View>

          <PlanBlock
            name="TEI Elemental"
            price="$0 per month"
            onSelect={() => onChoose('elemental')}
            tagline="Calculate Your Workload"
            intro="Use the Standard TEI Calculator to give each strength training session a numerical workload value."
          />
          <PlanBlock
            name="TEI Basic"
            price="$5 per month"
            onSelect={() => onChoose('basic')}
            tagline="Calculate. Save. Review."
            intro="Everything in Elemental, plus:"
            features={[
              'Save Your Sessions - Build a history of your TEI values.',
              'Review Your Workload - Compare past sessions to better understand your training efforts.',
            ]}
          />
          <PlanBlock
            name="TEI Premium"
            price="$11 per month"
            onSelect={() => onChoose('premium')}
            waitlist
            tagline="Measure. Understand. Plan."
            intro="Everything in Basic, plus:"
            features={[
              '5 Training Formats - Measure workload across different types of training.',
              'Progress Bars & Quick References - Visual guidance to help interpret your training.',
              'Track Your Workload - Review accumulated training load and recognize patterns over time.',
              'Workload Designer & Planner - Plan future training workloads and compare your intentions with your efforts.',
              'Personalize Your TEI \u2014 Choose from 11 accent colors to make the experience your own.',
            ]}
          />

          <Text style={styles.sheetSlogan} numberOfLines={1} adjustsFontSizeToFit>
            Your Training. Your Workload. Your Intelligence.
          </Text>

          {/* Returns to the Account Type Selection screen, where the user
              picks a tier from the three pills. */}
          <OutlineButton
            title="Select Your TEI"
            onPress={onClose}
            fontSize={23}
            style={{ marginTop: 18, alignSelf: 'center', paddingHorizontal: 44 }}
          />
        </ScrollView>
      </View>
    </View>
  );
}

function PlanBlock({
  name,
  price,
  tagline,
  intro,
  features = [],
  onSelect,
  waitlist = false,
}: {
  name: string;
  price: string;
  tagline: string;
  intro: string;
  features?: string[];
  onSelect: () => void;
  /** In development: dimmed price, IN DEVELOPMENT badge, WAITLIST pill. */
  waitlist?: boolean;
}) {
  const accent = useAccent();
  const pillColor = waitlist ? WAITLIST_YELLOW : accent;

  return (
    <View style={{ marginTop: 22 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[styles.planName, { color: accent }]}>{name}</Text>
        <Text
          style={[
            styles.planPrice,
            { color: waitlist ? '#8A8A8A' : accent },
          ]}
        >
          {price}
        </Text>
        {!waitlist && (
          <Pressable
            onPress={onSelect}
            accessibilityRole="button"
            accessibilityLabel={`Select ${name}`}
            style={[styles.selectBtn, { borderColor: pillColor }]}
          >
            <Text style={[styles.selectText, { color: pillColor }]}>SELECT</Text>
          </Pressable>
        )}
      </View>
      {waitlist && (
        <View style={styles.waitlistRow}>
          <InDevelopmentBadge />
          <Pressable
            onPress={onSelect}
            accessibilityRole="button"
            accessibilityLabel={`Join the ${name} waitlist`}
            style={[styles.selectBtn, { borderColor: pillColor }]}
          >
            <Text style={[styles.selectText, styles.waitlistText, { color: pillColor }]}>
              WAITLIST
            </Text>
          </Pressable>
        </View>
      )}
      <Text style={styles.planTagline}>{tagline}</Text>
      <Text style={styles.featBody}>{intro}</Text>
      {features.map((f) => (
        <View key={f} style={styles.bulletRow}>
          <Text style={styles.featBody}>•</Text>
          <Text style={[styles.featBody, { flex: 1 }]}>{f}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tei1: {
    color: '#D4D4D4',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  tei2: {
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -1.5,
    marginTop: -2,
  },
  question: {
    color: '#D8D8D8',
    fontSize: 24,
    textAlign: 'center',
    lineHeight: 31,
    marginTop: 48,
    marginBottom: 38,
    marginHorizontal: 6,
  },
  pill: {
    borderWidth: 1,
    borderColor: '#4E4E4E',
    borderRadius: 999,
    paddingVertical: 14,
  },
  pillCurrent: { borderWidth: 2 },
  pillCurrentTag: { fontWeight: '700' },
  switchNote: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: -22,
    marginBottom: 24,
  },
  pillText: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '500',
    textAlign: 'center',
  },
  pillSub: {
    color: '#CFCFCF',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
  },
  sheet: {
    height: '90%',
    backgroundColor: '#0D0D0D',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 38,
    fontWeight: '500',
    letterSpacing: -1,
  },
  sheetSub: { color: colors.text, fontSize: 23, fontWeight: '500', marginTop: 2 },
  planName: {
    flex: 1,
    fontSize: 26,
    fontWeight: '500',
    letterSpacing: -0.5,
  },
  planPrice: {
    fontSize: 14,
    fontStyle: 'italic',
    marginRight: 10,
  },
  selectBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 14,
  },
  selectText: { fontSize: 12, letterSpacing: 0.4 },
  waitlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  waitlistText: { fontWeight: '800', letterSpacing: 1 },
  planTagline: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: 6 },
  featBody: { color: '#D2D2D2', fontSize: 15.5, lineHeight: 21 },
  bulletRow: { flexDirection: 'row', gap: 8, paddingLeft: 8, marginTop: 3 },
  sheetSlogan: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 26,
  },
});
