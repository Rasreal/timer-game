import { useEffect, useState, type ReactNode } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackArrow, Ellipsis, OutlineButton } from '../../src/components/Chrome';
import { useAuth } from '../../src/auth';
import { formatSessionDate, useStore } from '../../src/store';
import { saveSession } from '../../src/lib/sessions';
import { savePlan } from '../../src/lib/plans';
import { DEFAULT_TARGET_MAX, EFFECTIVE_RANGES,
  LIMITS, displayTei, validateSessionInputs, type CalculatorId } from '../../src/lib/tei';
import { colors, useAccent, accentAlpha } from '../../src/theme';

/**
 * The four PREMIUM calculators differ only in which rings they show and which
 * `calculate*` they call, so the entire chrome — header, target bar, session
 * date, CTA row, save gating, tier guard — lives here and each screen supplies
 * its rings plus a `compute` callback.
 */
export interface CalcShellProps {
  /** Persisted with the row so Review can label the session's model. */
  calculator: CalculatorId;
  /** Green centred caption above the buttons, e.g. "YOGA Training". */
  sessionLabel: string;
  /** False disables "Calculate TEI" — every ring must have a value. */
  complete: boolean;
  /** Called on "Calculate TEI"; must be pure, it is only run on demand. */
  compute: () => number;
  /**
   * Only the variables the chosen calculator uses are supplied; the rest are
   * stored as null on the row.
   */
  saveFields: {
    sets?: number | null;
    restSeconds?: number | null;
    exertionPercent?: number | null;
    cardioMinutes: number;
    breakdowns?: number | null;
    exercises?: number | null;
    circuits?: number | null;
    yogaMinutes?: number | null;
  };
  /** Yoga is the only mock-up carrying the Effective Ranges pill. */
  showRangesPill?: boolean;
  /**
   * Screens whose rings wrap to three rows (Breakdown) need a tighter gap
   * between the rows than the two-row screens, so the whole page still lands
   * above the fold. Purely spacing — see `styles.ringRow`.
   */
  tightRings?: boolean;
  children: ReactNode;
}

export function CalcShell({
  calculator,
  sessionLabel,
  complete,
  compute,
  saveFields,
  showRangesPill = false,
  tightRings = false,
  children,
}: CalcShellProps) {
  const router = useRouter();
  // Present when we came from the 7-day planner: save a PLAN for that day
  // instead of logging a session that already happened.
  const { plan: planDay } = useLocalSearchParams<{ plan?: string }>();
  const insets = useSafeAreaInsets();
  const { session, showToast, targetRange } = useStore();
  const { profile } = useAuth();
  const [tei, setTei] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  // Same guard as app/calculator.tsx: SAVE is a single-shot action, so a
  // second press must not write a duplicate row.
  const [saved, setSaved] = useState(false);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const accent = useAccent();

  // These four calculators ship with TEI Premium only. `profile` is null while
  // it loads, so wait for it rather than bouncing a Premium user to Home.
  useEffect(() => {
    if (profile && profile.tier !== 'premium') router.replace('/home');
  }, [profile, router]);

  const score = tei === null ? 0 : displayTei(tei);
  const over = tei !== null && tei > LIMITS.tei.overAt;
  // Measure against the timeframe the user chose on Effective Ranges. Its max
  // is a period total (a week, a month), so a single session is only ever a
  // slice of it; with nothing chosen, fall back to WEEKLY — the smallest real
  // period target. LIMITS.tei.max is a SINGLE-SESSION ceiling and measuring
  // against it inflated the percentage more than threefold.
  const targetMax =
    EFFECTIVE_RANGES.find((r) => r.label === targetRange)?.max ?? DEFAULT_TARGET_MAX;
  const fraction =
    tei === null ? 0 : Math.max(0, Math.min(1, tei / targetMax));

  /**
   * The rings hand `min`/`max` to ProgressRing for the arc only, so an
   * impossible value typed straight into a circle used to be scored and saved
   * as if it were legal. Both CTAs run the same bounds check first.
   */
  function checkRange(): string | null {
    const problem = validateSessionInputs(calculator, saveFields);
    setRangeError(problem);
    return problem;
  }

  function calculate() {
    if (!complete) return;
    if (checkRange()) return;
    const next = compute();
    setTei(next);

    // The client considers a TEI above 33 practically unsurvivable, so this
    // almost always means the inputs were misunderstood rather than a real
    // workload. The red gradient above 22 already warns about heavy loads.
    if (next > LIMITS.tei.implausibleAbove) {
      showToast(
        `TEI ${next.toFixed(0)} is beyond a survivable workload — you may need to review how you are defining your data.`,
      );
    }
  }

  async function persist() {
    if (saving) return;
    if (checkRange()) return;

    // These calculators are Premium-only, and the tier guard above is an
    // effect — a Basic user can press SAVE before the redirect lands, so the
    // same gate is enforced here rather than merely excluding Elemental.
    if (!profile || profile.tier !== 'premium') {
      showToast(
        planDay
          ? 'Planning needs TEI Premium.'
          : 'Saving sessions needs TEI Basic or Premium.',
      );
      return;
    }
    if (tei === null) {
      showToast('Calculate the TEI before saving.');
      return;
    }
    if (saved) {
      showToast('This session is already saved.');
      return;
    }

    setSaving(true);

    if (planDay) {
      const { error: planError } = await savePlan({
        userId: profile.id,
        plannedFor: planDay,
        // Rounded exactly as the session row is, so a plan and the session
        // that fulfils it stay comparable.
        tei: Number(tei.toFixed(2)),
        calculator,
        sets: saveFields.sets ?? null,
        restSeconds: saveFields.restSeconds ?? null,
        exertionPercent: saveFields.exertionPercent ?? null,
        cardioMinutes: saveFields.cardioMinutes,
        breakdowns: saveFields.breakdowns ?? null,
        exercises: saveFields.exercises ?? null,
        circuits: saveFields.circuits ?? null,
        yogaMinutes: saveFields.yogaMinutes ?? null,
      });
      setSaving(false);
      if (planError) {
        showToast(`Could not save plan: ${planError}`);
        return;
      }
      showToast(`Planned — TEI ${tei.toFixed(2)}`);
      router.replace('/plan');
      return;
    }

    const { error } = await saveSession({
      userId: profile.id,
      // Stamp at save time: `session.date` is set when the draft is created,
      // which is not necessarily when the training happened.
      performedAt: new Date().toISOString(),
      cardioMinutes: saveFields.cardioMinutes,
      sets: saveFields.sets ?? null,
      restSeconds: saveFields.restSeconds ?? null,
      exertionPercent: saveFields.exertionPercent ?? null,
      breakdowns: saveFields.breakdowns ?? null,
      exercises: saveFields.exercises ?? null,
      circuits: saveFields.circuits ?? null,
      yogaMinutes: saveFields.yogaMinutes ?? null,
      tei: Number(tei.toFixed(2)),
      calculator,
    });
    setSaving(false);

    if (!error) setSaved(true);
    showToast(error ? `Could not save: ${error}` : `Saved — TEI ${tei.toFixed(2)}`);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + 2,
        paddingHorizontal: 20,
        paddingBottom: Math.max(insets.bottom, 8) + 6,
        flexGrow: 1,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <BackArrow
        onPress={() => {
          // Once a score exists this session is finished, so back belongs on
          // Home — returning to the selector invited the user to re-pick a
          // training type they had already logged.
          if (tei !== null) {
            router.replace('/home');
            return;
          }
          // Nothing calculated yet: go back to wherever they came from.
          // router.back() alone is a no-op when this screen was opened
          // directly (deep link, or after a redirect consumed the history),
          // leaving the arrow visibly dead. Fall back to the selector, which
          // is where a Premium user reaches these calculators from.
          router.canGoBack() ? router.back() : router.replace('/session-type');
        }}
      />

      <View style={styles.headRow}>
        <View style={styles.lockupCol}>
          <StackedLockup />
          {showRangesPill && (
            <Pressable
              onPress={() => router.push('/ranges')}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.pill,
                { borderColor: accent },
                { backgroundColor: pressed ? accentAlpha(accent, 0.16) : 'transparent' },
              ]}
            >
              <Text style={[styles.pillText, { color: accent }]}>Effective Ranges</Text>
            </Pressable>
          )}
        </View>

        <BigScore value={score} over={over} />
      </View>

      <View style={styles.targetBlock}>
        <Text style={styles.targetPct}>{Math.round(fraction * 100)}%</Text>
        <Text style={styles.targetLabel}>of Target</Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { flex: fraction }]} />
          <View style={{ flex: 1 - fraction }} />
        </View>
      </View>

      <View style={styles.sessionBlock}>
        <View style={styles.sessionRow}>
          <CalendarGlyph />
          <Text style={styles.sessionLabelText}>This Session</Text>
          <Ellipsis
            onPress={() => showToast('Date picking is not wired up on this calculator yet.')}
            color="#8A8A8A"
            size={20}
            label="Change session date"
          />
        </View>
        <Text style={styles.sessionDate}>{formatSessionDate(session.date)}</Text>
      </View>

      <View style={[styles.rings, tightRings && styles.ringsTight]}>{children}</View>

      <View style={{ flex: 1, minHeight: 4 }} />

      <Text style={styles.greenLabel}>{sessionLabel}</Text>

      <View style={styles.ctaRow}>
        <OutlineButton
          title="Calculate TEI"
          disabled={!complete}
          onPress={calculate}
          style={{ flex: 1 }}
        />
        <OutlineButton title={saving ? 'Saving…' : 'SAVE'} disabled={saving} onPress={persist} />
      </View>

      {rangeError && <Text style={styles.rangeError}>{rangeError}</Text>}
    </ScrollView>
  );
}

/**
 * The Premium mock-ups stack TOTAL / EFFECT / INDEX on three lines; the shared
 * `TeiLockup` renders them on one, so this variant is local to these screens.
 */
function StackedLockup() {
  return (
    <View>
      <Text style={styles.lockupWord}>TOTAL</Text>
      <Text style={styles.lockupWord}>EFFECT</Text>
      <Text style={styles.lockupWord}>INDEX</Text>
      <Text style={styles.lockupTei}>TEI</Text>
    </View>
  );
}

/**
 * The oversized score. RN has no background-clip:text, so the orange glyphs
 * are faded toward charcoal by a gradient scrim drawn over them.
 */
function BigScore({ value, over }: { value: number; over: boolean }) {
  return (
    <View>
      <Text style={[styles.bigNumber, { color: over ? colors.red : colors.orange }]}>
        {value}
      </Text>
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.88)']}
        locations={[0.25, 0.62, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    </View>
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

/** Rings sit in centred rows; screens compose these to match their mock-up. */
export function RingRow({ children }: { children: ReactNode }) {
  return <View style={styles.ringRow}>{children}</View>;
}

const styles = StyleSheet.create({
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    minHeight: 104,
  },
  lockupCol: { paddingTop: 0 },
  lockupWord: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.2,
    lineHeight: 25,
    color: '#9A9A9A',
  },
  lockupTei: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 37,
    color: colors.text,
  },
  pill: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 12,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  pillText: { fontSize: 14, fontWeight: '700' },
  bigNumber: {
    fontSize: 100,
    fontWeight: '800',
    letterSpacing: -3.5,
    lineHeight: 104,
    // Negative tracking clips the final glyph without a little breathing room.
    paddingRight: 6,
  },
  targetBlock: { marginTop: 2 },
  targetPct: { color: colors.text, fontSize: 30, fontWeight: '700', lineHeight: 34 },
  targetLabel: { color: '#C9C9C9', fontSize: 18, lineHeight: 21, marginTop: -2 },
  barTrack: {
    flexDirection: 'row',
    height: 13,
    borderRadius: 3,
    backgroundColor: '#3A3A3A',
    overflow: 'hidden',
    marginTop: 6,
  },
  barFill: { backgroundColor: '#8A5A2B' },
  sessionBlock: { marginTop: 6 },
  sessionRow: { flexDirection: 'row', alignItems: 'center' },
  sessionLabelText: {
    color: '#C9C9C9',
    fontSize: 18,
    lineHeight: 21,
    marginLeft: 8,
    marginRight: 8,
  },
  sessionDate: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '500',
    marginTop: 1,
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
  rings: { marginTop: 10, marginBottom: 6, rowGap: 4 },
  // Breakdown wraps to three ring rows; pulling the rows together (and the
  // block up under the session date) is what keeps its CTA above the fold.
  ringsTight: { marginTop: -4, marginBottom: -4, rowGap: -18 },
  ringRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    columnGap: 12,
  },
  greenLabel: {
    color: colors.green,
    fontSize: 19,
    lineHeight: 23,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 6,
  },
  ctaRow: { flexDirection: 'row', gap: 12 },
  rangeError: {
    color: '#FF6B6B',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    textAlign: 'center',
  },
});
