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
  const { session, profile, changeTier } = useAuth();
  const [showFeatures, setShowFeatures] = useState(false);
  const [busy, setBusy] = useState<Tier | null>(null);
  const accent = useAccent();

  // Two modes: picking a tier during sign-up, or switching tier afterwards.
  const signedIn = session != null;

  async function choose(tier: Tier) {
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

    // Prototype: tiers switch freely, with no payment step.
    setBusy(tier);
    const error = await changeTier(tier);
    setBusy(null);

    if (error) {
      showToast(`Could not switch plan: ${error}`);
      return;
    }
    showToast(`Switched to TEI ${label(tier)}.`);
    router.replace('/home');
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

        {signedIn && (
          <Text style={[styles.switchNote, { color: accent }]}>
            Prototype: plans switch instantly, with no payment.
          </Text>
        )}

        <TierRow
          label="Helpful"
          current={profile?.tier === 'elemental'}
          busy={busy === 'elemental'}
          subPrefix="TEI"
          subText=" Elemental - FREE"
          onSelect={() => choose('elemental')}
          onEllipsis={() => setShowFeatures(true)}
        />
        <Divider style={{ marginVertical: 24, marginHorizontal: 34 }} />
        <TierRow
          label="Insightful"
          current={profile?.tier === 'basic'}
          busy={busy === 'basic'}
          subPrefix="TEI"
          subText=" Basic - $5 per month"
          onSelect={() => choose('basic')}
          onEllipsis={() => setShowFeatures(true)}
        />
        <Divider style={{ marginVertical: 24, marginHorizontal: 34 }} />
        <TierRow
          label="Transformative"
          current={profile?.tier === 'premium'}
          busy={busy === 'premium'}
          subPrefix="TEI"
          subText=" Premium - $11 per month"
          onSelect={() => choose('premium')}
          onEllipsis={() => setShowFeatures(true)}
        />
      </ScrollView>

      <Modal
        visible={showFeatures}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFeatures(false)}
      >
        <TheThreeTei onClose={() => setShowFeatures(false)} onChoose={choose} />
      </Modal>
    </View>
  );
}

function TierRow({
  label,
  subPrefix,
  subText,
  onSelect,
  onEllipsis,
  current = false,
  busy = false,
}: {
  label: string;
  subPrefix: string;
  subText: string;
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
            current && [styles.pillCurrent, { borderColor: accent }],
          ]}
        >
          <Text style={styles.pillText}>
            {busy ? '…' : label}
            {current && !busy && <Text style={[styles.pillCurrentTag, { color: accent }]}>  ✓</Text>}
          </Text>
        </Pressable>
        <Text style={styles.pillSub}>
          <Text style={{ fontWeight: '700' }}>{subPrefix}</Text>
          {subText}
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
  // The per-plan SELECT pills commit immediately; the primary CTA at the foot
  // commits whichever plan is currently highlighted, so it needs its own
  // selection state. Nothing is preselected — the sheet is an explainer first.
  const [picked, setPicked] = useState<Tier | null>(null);
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
            onHighlight={() => setPicked('elemental')}
            picked={picked === 'elemental'}
            features={[
              {
                title: 'Standard TEI Calculator',
                body: 'Calculate the Total Effect Index value for each of your training sessions.',
              },
            ]}
          />
          <PlanBlock
            name="TEI Basic"
            price="$5 per month"
            onSelect={() => onChoose('basic')}
            onHighlight={() => setPicked('basic')}
            picked={picked === 'basic'}
            features={[
              {
                title: 'Standard TEI Calculator',
                body: 'Calculate the Total Effect Index value for each of your training sessions.',
              },
              {
                title: 'Save All Session TEI Values',
                body: 'Review previous training session values to manage your conditioning workload and avoid injury.',
              },
            ]}
          />
          <PlanBlock
            name="TEI Premium"
            price="$11 per month"
            onSelect={() => onChoose('premium')}
            onHighlight={() => setPicked('premium')}
            picked={picked === 'premium'}
            features={[
              {
                title: 'Choose from 5 Different Training Formats',
                body: 'Choose from 5 Different Training Session Formats and Calculate the Total Effect Index value for each of your unique training sessions.',
              },
              {
                title: 'Progress Bars and Quick References',
                body: 'Many points throughout the App have visual references that will help you make quick decisions about YOUR training session needs.',
              },
              {
                title: 'Save & Track Your Week, Month, Year, etc...',
                body: 'Review & manage your total training load period to period, to know when to adjust or modify your plan - know when to push and when to recover to BE Your Best.',
              },
              {
                title: 'Workload Designer & Planner',
                body: 'Design and Plan your training workloads and plug it into your calendar to help you know when and how to do what it takes to maximize your fitness and conditioning results.',
              },
            ]}
          />

          <OutlineButton
            title="Select Your TEI"
            // Commits the highlighted plan. With nothing highlighted there is
            // no plan to commit, so it just dismisses — never a stray choice.
            onPress={() => (picked ? onChoose(picked) : onClose())}
            fontSize={23}
            style={{ marginTop: 22 }}
          />
        </ScrollView>
      </View>
    </View>
  );
}

function PlanBlock({
  name,
  price,
  features,
  onSelect,
  onHighlight,
  picked = false,
}: {
  name: string;
  price: string;
  features: { title: string; body: string }[];
  onSelect: () => void;
  /** Highlights this plan for the sheet's primary "Select Your TEI" button. */
  onHighlight: () => void;
  picked?: boolean;
}) {
  const accent = useAccent();

  return (
    <View style={{ marginTop: 22 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Pressable
          onPress={onHighlight}
          accessibilityRole="button"
          accessibilityLabel={`Highlight ${name}`}
          accessibilityState={{ selected: picked }}
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
        >
          <Text
            style={[
              styles.planName,
              { color: accent },
              picked && styles.planNamePicked,
            ]}
          >
            {name}
          </Text>
          <Text style={[styles.planPrice, { color: accent }]}>{price}</Text>
        </Pressable>
        <Pressable
          onPress={onSelect}
          accessibilityRole="button"
          style={[styles.selectBtn, { borderColor: accent }]}
        >
          <Text style={[styles.selectText, { color: accent }]}>SELECT</Text>
        </Pressable>
      </View>
      {features.map((f) => (
        <View key={f.title} style={{ marginTop: 12 }}>
          <Text style={styles.featTitle}>• {f.title}</Text>
          <Text style={styles.featBody}>{f.body}</Text>
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
  planNamePicked: { color: colors.text, fontWeight: '700' },
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
  featTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  featBody: { color: '#D2D2D2', fontSize: 15.5, lineHeight: 21 },
});
