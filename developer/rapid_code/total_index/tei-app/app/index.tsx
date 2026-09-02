import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RhinoWordmark } from '../src/components/Chrome';
import { colors, useAccent, accentAlpha } from '../src/theme';

const rhino = require('../assets/rhino.png');

/** Screen 1 — Onboarding Launch Screen. */
export default function Launch() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showWhat, setShowWhat] = useState(false);
  const accent = useAccent();

  return (
    <View style={styles.root}>
      {/* Black upper section carrying the brand + rhino */}
      <View style={{ backgroundColor: '#000', paddingTop: insets.top + 24 }}>
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={styles.missionSimple}>
            Mission. <Text style={{ color: colors.orange }}>Simple.</Text>
          </Text>
          <RhinoWordmark height={19} color="#5F5F5F" align="flex-end" />
        </View>

        <Image
          source={rhino}
          style={styles.rhinoHero}
          resizeMode="contain"
          accessibilityLabel="Rhino Athletics"
        />

        <View style={{ height: 1, backgroundColor: colors.orange, opacity: 0.9 }} />

        <View style={styles.teiRow}>
          <Text style={styles.totalEffectIndex}>Total Effect Index</Text>
          <Text style={styles.teiBig}>TEI</Text>
        </View>
      </View>

      {/* Charcoal lower section with the CTAs */}
      <View
        style={[
          styles.lower,
          { paddingBottom: Math.max(insets.bottom, 20) + 24 },
        ]}
      >
        <Pressable
          onPress={() => router.push('/login')}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.goTei,
            { borderColor: accent },
            { backgroundColor: pressed ? accentAlpha(accent, 0.16) : 'transparent' },
          ]}
        >
          <Text style={[styles.goTeiText, { color: accent }]}>GO{'\n'}TEI</Text>
        </Pressable>

        <Pressable onPress={() => setShowWhat(true)} accessibilityRole="button">
          <Text style={styles.whatIs}>
            What is <Text style={{ color: colors.orange }}>TEI ↗</Text>
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={showWhat}
        animationType="slide"
        transparent
        onRequestClose={() => setShowWhat(false)}
      >
        <WhatIsTei
          onClose={() => setShowWhat(false)}
          onGo={() => {
            setShowWhat(false);
            router.push('/login');
          }}
        />
      </Modal>
    </View>
  );
}

/** Screen 2 — "What is TEI?" micro-screen. */
function WhatIsTei({ onClose, onGo }: { onClose: () => void; onGo: () => void }) {
  const insets = useSafeAreaInsets();
  const accent = useAccent();
  return (
    <View style={styles.sheetBackdrop}>
      <View style={styles.sheet}>
        <ScrollView
          contentContainerStyle={{
            padding: 24,
            paddingBottom: Math.max(insets.bottom, 20) + 24,
          }}
        >
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={14}
            style={{ alignSelf: 'flex-end' }}
          >
            <Text style={{ color: colors.orange, fontSize: 30, fontWeight: '300' }}>
              ✕
            </Text>
          </Pressable>

          <Text style={styles.sheetTitle}>What is TEI?</Text>
          <Text style={styles.sheetSub}>Turn every workout into a score.</Text>
          <Text style={styles.sheetBody}>
            TEI (Total Effect Index) gives each workout a numerical value so you
            can measure effectiveness, avoid overtraining, and improve
            consistently.
          </Text>

          <Text style={[styles.howItWorks, { color: accent }]}>How it Works...</Text>

          <Step
            n="1."
            title="Score Your Workout"
            body="Sets, rest, and cardio are combined into one daily value"
          />
          <Step
            n="2."
            title="Track Your Week, Month, Year, etc..."
            body="Daily scores build your total training load"
          />
          <Step
            n="3."
            title="Adjust & Improve"
            body="Know when to push, recover, and get better results"
          />

          <Text style={styles.stopGuessing}>
            Stop guessing. Start training with data.
          </Text>

          <Pressable
            onPress={onGo}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.seeMyTei,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.seeMyTeiText}>See My TEI</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>
        {n} {title}
      </Text>
      <Text style={{ color: '#DCDCDC', fontSize: 16 }}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#2F2F2F' },
  missionSimple: {
    color: colors.text,
    fontSize: 38,
    fontWeight: '500',
    letterSpacing: -1,
    textAlign: 'right',
  },
  rhinoHero: { width: '100%', height: 240, marginTop: 20 },
  teiRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 22,
  },
  totalEffectIndex: {
    color: colors.text,
    fontSize: 31,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 7,
    marginRight: 10,
  },
  teiBig: {
    color: colors.text,
    fontSize: 68,
    fontWeight: '800',
    letterSpacing: -2,
  },
  lower: {
    flex: 1,
    backgroundColor: '#2F2F2F',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  goTei: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  goTeiText: {
    fontSize: 25,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 29,
  },
  whatIs: { color: colors.text, fontSize: 22, fontWeight: '600' },

  sheetBackdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    height: '84%',
    backgroundColor: 'rgba(46,46,46,0.99)',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 42,
    fontWeight: '600',
    letterSpacing: -1,
    marginTop: 6,
  },
  sheetSub: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '500',
    marginTop: 6,
    marginBottom: 18,
  },
  sheetBody: {
    color: '#E2E2E2',
    fontSize: 17,
    lineHeight: 24,
    marginBottom: 32,
  },
  howItWorks: {
    fontSize: 27,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  stopGuessing: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 26,
    marginBottom: 22,
  },
  seeMyTei: {
    backgroundColor: '#141414',
    paddingVertical: 15,
    borderRadius: 4,
  },
  seeMyTeiText: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '500',
    textAlign: 'center',
  },
});
