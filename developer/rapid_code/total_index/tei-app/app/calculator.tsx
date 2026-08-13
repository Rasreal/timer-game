import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BackArrow,
  Ellipsis,
  OutlineButton,
  TeiLockup,
} from '../src/components/Chrome';
import { Ring } from '../src/components/Ring';
import { useAuth } from '../src/auth';
import { formatSessionDate, useStore } from '../src/store';
import { saveSession } from '../src/lib/sessions';
import { LIMITS, calculateTei, displayTei } from '../src/lib/tei';
import { colors } from '../src/theme';

/** ELEMENTAL Screen 2 — Standard Strength Training Calculator. */
export default function Calculator() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, showToast } = useStore();
  const { profile } = useAuth();
  const [calculated, setCalculated] = useState(false);
  const [saving, setSaving] = useState(false);

  // Elemental is calculate-only by design; paid tiers persist history.
  const canSaveHistory = profile != null && profile.tier !== 'elemental';

  const complete =
    session.sets !== null &&
    session.restSeconds !== null &&
    session.exertionPercent !== null &&
    session.cardioMinutes !== null;

  const result = useMemo(
    () =>
      calculateTei({
        sets: session.sets ?? 0,
        restSeconds: session.restSeconds ?? 0,
        exertionPercent: session.exertionPercent ?? 0,
        cardioMinutes: session.cardioMinutes ?? 0,
      }),
    [session],
  );

  const showResult = calculated && complete;

  async function calculate() {
    if (!complete) return;
    setCalculated(true);

    if (!canSaveHistory || !profile) {
      showToast(`TEI ${result.tei.toFixed(2)} for this session`);
      return;
    }

    setSaving(true);
    const { error } = await saveSession({
      userId: profile.id,
      performedAt: session.date,
      sets: session.sets ?? 0,
      restSeconds: session.restSeconds ?? 0,
      exertionPercent: session.exertionPercent ?? 0,
      cardioMinutes: session.cardioMinutes ?? 0,
      tei: Number(result.tei.toFixed(2)),
    });
    setSaving(false);

    showToast(
      error
        ? `Could not save session: ${error}`
        : `Saved — TEI ${result.tei.toFixed(2)}`,
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingHorizontal: 20,
        paddingBottom: Math.max(insets.bottom, 16) + 16,
        flexGrow: 1,
      }}
    >
      <BackArrow onPress={() => router.replace('/home')} />

      {/* Large number + TEI lockup */}
      <View style={styles.headRow}>
        <View style={{ paddingTop: 30 }}>
          <TeiLockup align="left" size="sm" />
        </View>

        {showResult ? (
          <MaskedNumber value={displayTei(result.tei)} />
        ) : (
          <Text style={[styles.bigNumber, { color: '#1A1A1A' }]}>0</Text>
        )}
      </View>

      {/* Session date */}
      <View style={{ marginTop: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <CalendarGlyph />
          <Text style={styles.sessionLabel}>This Session</Text>
          <Ellipsis
            onPress={() => showToast('Date picking arrives with the Basic tier.')}
            color="#8A8A8A"
            size={20}
            label="Change session date"
          />
        </View>
        <Text style={styles.sessionDate}>{formatSessionDate(session.date)}</Text>
      </View>

      {/* Four variable rings */}
      <View style={styles.ringGrid}>
        <Ring
          value={session.sets}
          label="Sets"
          onEllipsis={() => router.push('/entry/sets')}
          overRange={session.sets !== null && session.sets > LIMITS.sets.overAt}
        />
        <Ring
          value={session.restSeconds}
          label="Seconds"
          onEllipsis={() => router.push('/entry/rest')}
          overRange={
            session.restSeconds !== null && session.restSeconds < LIMITS.rest.min
          }
        />
        <Ring
          value={session.exertionPercent}
          label="% Exert"
          onEllipsis={() => router.push('/entry/exertion')}
        />
        <Ring
          value={session.cardioMinutes}
          label="Minutes"
          onEllipsis={() => router.push('/entry/cardio')}
        />
      </View>

      <View style={{ flex: 1, minHeight: 12 }} />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <OutlineButton
          title={saving ? 'Saving…' : 'Calculate TEI'}
          disabled={!complete || saving}
          onPress={calculate}
          style={{ flex: 1 }}
        />
        <OutlineButton title="Ranges" onPress={() => router.push('/ranges')} />
      </View>

      {!complete && (
        <Text style={styles.hint}>
          Tap the ••• under each circle to enter a value.
        </Text>
      )}

      {showResult && (
        <View style={styles.breakdown}>
          <Text style={styles.breakdownTitle}>How this TEI was calculated</Text>
          <Text style={styles.breakdownBody}>
            (({session.sets} × 0.06) × {result.restValue.toFixed(2)} ×{' '}
            {result.exertionValue.toFixed(2)}) + {result.cardioValue.toFixed(2)}{' '}
            = {(result.tei / 10).toFixed(3)}
          </Text>
          <Text style={styles.breakdownBody}>
            × 10 ={' '}
            <Text style={{ color: colors.orange, fontWeight: '700' }}>
              {result.tei.toFixed(2)} TEI
            </Text>
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

/** Small calendar mark drawn with Views to avoid an emoji/SVG dependency. */
function CalendarGlyph() {
  return (
    <View style={styles.calGlyph}>
      <View style={styles.calHeader} />
      <View style={styles.calDots}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={styles.calDot} />
        ))}
      </View>
    </View>
  );
}

/**
 * The oversized score with the orange-to-charcoal gradient from the mock-ups.
 * RN has no background-clip:text, so the gradient is masked by overlaying it
 * on the glyphs via a transparent-text trick is unavailable — instead the
 * gradient is drawn behind and clipped to the text bounds using a container
 * the same size as the number.
 */
function MaskedNumber({ value }: { value: number }) {
  return (
    <View>
      <Text style={[styles.bigNumber, { color: colors.orange }]}>{value}</Text>
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.88)']}
        locations={[0.25, 0.62, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    minHeight: 150,
  },
  bigNumber: {
    fontSize: 132,
    fontWeight: '800',
    letterSpacing: -5,
    lineHeight: 150,
    // Negative tracking clips the final glyph without a little breathing room.
    paddingRight: 6,
  },
  calGlyph: {
    width: 19,
    height: 19,
    borderWidth: 1.6,
    borderColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  calHeader: { height: 4, backgroundColor: '#E0E0E0' },
  calDots: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'center',
    justifyContent: 'center',
    paddingHorizontal: 1.5,
    gap: 1.5,
  },
  calDot: { width: 3, height: 3, backgroundColor: '#E0E0E0' },
  sessionLabel: { color: '#C9C9C9', fontSize: 18, marginLeft: 8, marginRight: 8 },
  sessionDate: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '500',
    marginTop: 2,
  },
  ringGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    rowGap: 14,
    marginTop: 22,
    marginBottom: 16,
  },
  hint: {
    color: '#7A7A7A',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
  },
  breakdown: {
    marginTop: 14,
    padding: 14,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 11,
  },
  breakdownTitle: {
    color: '#CFCFCF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  breakdownBody: { color: '#9D9D9D', fontSize: 12.5, lineHeight: 20 },
});
