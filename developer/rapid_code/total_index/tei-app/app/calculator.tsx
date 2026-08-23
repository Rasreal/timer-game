import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { savePlan } from '../src/lib/plans';
import {
  DEFAULT_TARGET_MAX,
  EFFECTIVE_RANGES,
  LIMITS,
  calculateTei,
  displayTei,
  validateSessionInputs,
} from '../src/lib/tei';
import { SHOW_DEV_TOOLS, colors } from '../src/theme';

/** ELEMENTAL Screen 2 — Standard Strength Training Calculator. */
export default function Calculator() {
  const router = useRouter();
  // Present when we came from the planner: this run designs a PLAN for that
  // day rather than logging a session that already happened.
  const { plan: planDay } = useLocalSearchParams<{ plan?: string }>();
  const insets = useSafeAreaInsets();
  const { session, setSessionField, showToast, targetRange } = useStore();
  const { profile } = useAuth();
  const [calculated, setCalculated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // A value typed straight into a ring that falls outside LIMITS. Shown next
  // to the CTA in the same style as a save failure.
  const [rangeError, setRangeError] = useState<string | null>(null);

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

  // Client's tiered intent: on Basic and above, tapping a timeframe on the
  // Effective Ranges screen makes it the denominator of "% of Target".
  // Elemental has no bar — that screen is informational only for them.
  const showTargetBar = profile != null && profile.tier !== 'elemental';
  // With no timeframe chosen, measure against WEEKLY — the smallest real
  // period target. LIMITS.tei.max is a single-SESSION ceiling, so using it
  // here inflated the percentage more than threefold.
  const targetMax =
    EFFECTIVE_RANGES.find((r) => r.label === targetRange)?.max ??
    DEFAULT_TARGET_MAX;
  const targetFraction = showResult
    ? Math.max(0, Math.min(1, result.tei / targetMax))
    : 0;

  async function calculate() {
    if (!complete || saving) return;
    setCalculated(true);
    setSaveError(null);

    // The rings pass min/max to the arc geometry only, so an impossible value
    // typed straight into a circle used to be scored as if it were legal.
    const outOfRange = validateSessionInputs('standard', {
      sets: session.sets,
      restSeconds: session.restSeconds,
      exertionPercent: session.exertionPercent,
      cardioMinutes: session.cardioMinutes,
    });
    setRangeError(outOfRange);
    if (outOfRange) {
      // Nothing is calculated or saved from impossible inputs; the message
      // stays on screen next to the CTA rather than in a transient toast.
      setCalculated(false);
      return;
    }

    // The client considers a TEI above 33 practically unsurvivable, so this
    // almost always means the inputs were misunderstood. `showToast` keeps
    // only the newest message, so the warning is folded into whichever toast
    // each path actually shows rather than fired as a second, doomed one.
    const warning =
      result.tei > LIMITS.tei.implausibleAbove
        ? `TEI ${result.tei.toFixed(0)} is beyond a survivable workload — you may need to review how you are defining your data.`
        : null;

    if (planDay) {
      if (!profile || profile.tier !== 'premium') {
        showToast('Planning needs TEI Premium.');
        return;
      }
      setSaving(true);
      const { error } = await savePlan({
        userId: profile.id,
        plannedFor: planDay,
        tei: Number(result.tei.toFixed(2)),
        calculator: 'standard',
        sets: session.sets,
        restSeconds: session.restSeconds,
        exertionPercent: session.exertionPercent,
        cardioMinutes: session.cardioMinutes,
      });
      setSaving(false);
      if (error) {
        setSaveError(error);
        return;
      }
      // Warn before navigating away, so an unsurvivable plan is never saved
      // silently.
      showToast(warning ?? `Planned — TEI ${result.tei.toFixed(2)}`);
      router.replace('/plan');
      return;
    }

    if (!canSaveHistory || !profile) {
      showToast(warning ?? `TEI ${result.tei.toFixed(2)} for this session`);
      return;
    }

    if (saved) {
      showToast('This session is already saved.');
      return;
    }

    setSaving(true);
    const { error } = await saveSession({
      userId: profile.id,
      // Stamp at save time. `session.date` is set when the draft is created,
      // which for a long-lived app session is not when training happened.
      performedAt: new Date().toISOString(),
      sets: session.sets ?? 0,
      restSeconds: session.restSeconds ?? 0,
      exertionPercent: session.exertionPercent ?? 0,
      cardioMinutes: session.cardioMinutes ?? 0,
      tei: Number(result.tei.toFixed(2)),
    });
    setSaving(false);

    if (error) {
      // A transient toast is too easy to miss when the big number already
      // reads like a success, so keep the failure on screen.
      setSaveError(error);
      return;
    }

    setSaved(true);
    showToast(warning ?? `Saved — TEI ${result.tei.toFixed(2)}`);
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
      <BackArrow
        onPress={() => {
          // Once a score exists this session is finished, so back belongs on
          // Home — returning to the selector invited the user to re-pick a
          // training type they had already logged.
          if (showResult) {
            router.replace('/home');
            return;
          }
          // Nothing calculated yet: go back to whatever opened this screen —
          // Home for Elemental and Basic, but the session-type selector for
          // Premium. Hard-coding /home skipped the selector and looked like
          // the app had jumped.
          router.canGoBack() ? router.back() : router.replace('/home');
        }}
      />

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

      {showTargetBar && (
        <View style={styles.targetWrap}>
          <Text style={styles.targetPct}>
            {Math.round(targetFraction * 100)}%
          </Text>
          <Text style={styles.targetLabel}>
            of {targetRange ? `${targetRange} Target` : 'Target'}
          </Text>
          <View style={styles.targetTrack}>
            <View
              style={[styles.targetFill, { width: `${targetFraction * 100}%` }]}
            />
          </View>
        </View>
      )}

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
        {/* Spec (deck slide 13): every calculator offers two layers of data
            entry — direct entry into the circle, or the ellipsis for a
            dedicated screen explaining the variable. */}
        <Ring
          value={session.sets}
          label="Sets"
          onChange={(v) => setSessionField('sets', v)}
          onEllipsis={() => router.push('/entry/sets?from=standard' as never)}
          overRange={session.sets !== null && session.sets > LIMITS.sets.overAt}
        />
        <Ring
          value={session.restSeconds}
          label="Seconds"
          onChange={(v) => setSessionField('restSeconds', v)}
          onEllipsis={() => router.push('/entry/rest?from=standard' as never)}
          overRange={
            // 0 means "not entered yet" (or auto-filled for a cardio-only
            // session), so it must not read as a dangerously short rest.
            session.restSeconds !== null &&
            session.restSeconds > 0 &&
            session.restSeconds < LIMITS.rest.min
          }
        />
        <Ring
          value={session.exertionPercent}
          label="% Exert"
          onChange={(v) => setSessionField('exertionPercent', v)}
          onEllipsis={() => router.push('/entry/exertion?from=standard' as never)}
          overRange={
            // Exertion is a 50-100 band, so either side of it is out of range.
            // 0 is the zero-fill of a cardio-only session, not a bad entry.
            session.exertionPercent !== null &&
            session.exertionPercent > 0 &&
            (session.exertionPercent < LIMITS.exertion.min ||
              session.exertionPercent > LIMITS.exertion.max)
          }
        />
        <Ring
          value={session.cardioMinutes}
          label="Minutes"
          onChange={(v) => {
            setSessionField('cardioMinutes', v);
            // Client rule: someone logging a Cardio ONLY session enters cardio
            // first, so zero-fill the untouched strength variables rather than
            // making them type three zeros.
            if (
              v !== null &&
              session.sets === null &&
              session.restSeconds === null &&
              session.exertionPercent === null
            ) {
              setSessionField('sets', 0);
              setSessionField('restSeconds', 0);
              setSessionField('exertionPercent', 0);
            }
          }}
          onEllipsis={() => router.push('/entry/cardio?from=standard' as never)}
          overRange={
            session.cardioMinutes !== null &&
            session.cardioMinutes > LIMITS.cardio.overAt
          }
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

      {rangeError && <Text style={styles.saveError}>{rangeError}</Text>}

      {saveError && (
        <Text style={styles.saveError}>Could not save session: {saveError}</Text>
      )}

      {!complete && (
        <Text style={styles.hint}>
          Type into a circle, or tap its ••• for guidance.
        </Text>
      )}

      {showResult && SHOW_DEV_TOOLS && (
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
  targetWrap: { marginTop: 4, marginBottom: 4 },
  targetPct: { color: colors.text, fontSize: 26, fontWeight: '700' },
  targetLabel: { color: '#C9C9C9', fontSize: 16, marginTop: -2 },
  targetTrack: {
    height: 12,
    backgroundColor: '#2E2E2E',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  targetFill: { height: 12, backgroundColor: '#8A5A22' },
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
  saveError: {
    color: '#FF6B6B',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
    textAlign: 'center',
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
