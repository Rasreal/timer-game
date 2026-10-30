import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BackArrow,
  Ellipsis,
  OutlineButton,
} from '../src/components/Chrome';
import { DatePicker } from '../src/components/DatePicker';
import { DeleteSessionButton } from '../src/components/DeleteSessionButton';
import { Ring } from '../src/components/Ring';
import { useKeyboardLift } from '../src/components/useKeyboardLift';
import { useAuth } from '../src/auth';
import { formatSessionDate, useStore } from '../src/store';
import { saveSession, updateSession } from '../src/lib/sessions';
import { savePlan } from '../src/lib/plans';
import {
  LIMITS,
  calculateTei,
  displayTei,
  targetForRange,
  validateSessionInputs,
} from '../src/lib/tei';
import { SHOW_DEV_TOOLS, accentAlpha, colors, useAccent } from '../src/theme';

/** ELEMENTAL Screen 2 — Standard Strength Training Calculator. */
export default function Calculator() {
  const router = useRouter();
  // Present when we came from the planner: this run designs a PLAN for that
  // day rather than logging a session that already happened.
  const { plan: planDay } = useLocalSearchParams<{ plan?: string }>();
  const insets = useSafeAreaInsets();
  const { session, setSessionField, setSessionDate, resetSession, showToast, targetRange } =
    useStore();
  const { profile } = useAuth();
  // A saved session opened from Review for correction. Planner mode never
  // edits, and a draft loaded for another calculator is not ours to edit.
  const editing =
    !planDay && session.editing?.calculator === 'standard' ? session.editing : null;
  const lift = useKeyboardLift(insets.top);
  const accent = useAccent();
  // An opened session already has its score, so it starts calculated.
  const [calculated, setCalculated] = useState(editing !== null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // A value typed straight into a ring that falls outside LIMITS. Shown next
  // to the CTA in the same style as a save failure.
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [pickingDate, setPickingDate] = useState(false);

  // Elemental is calculate-only by design; paid tiers persist history.
  const canSaveHistory = profile != null && profile.tier !== 'elemental';
  // Planner mode always offers SAVE so a non-Premium user hears why it
  // cannot plan rather than finding no button at all. Elemental gets no SAVE:
  // a full-width Calculate TEI and an Upgrade link instead of a dead button
  // (30 Oct 2026 wireframe).
  const showSave = canSaveHistory || Boolean(planDay);

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

  // Editing any variable after a calculation makes that score stale: clear it
  // so the user re-calculates before SAVE (a new session, or the corrected
  // one when editing). Compared by value so the mount (and a strict-mode
  // re-run) does not wipe an opened session's score.
  const inputsKey = `${session.sets}|${session.restSeconds}|${session.exertionPercent}|${session.cardioMinutes}`;
  const lastInputs = useRef(inputsKey);
  useEffect(() => {
    if (lastInputs.current === inputsKey) return;
    lastInputs.current = inputsKey;
    setCalculated(false);
    setSaved(false);
    setSaveError(null);
  }, [inputsKey]);

  // Client's tiered intent: on Basic and above, tapping a timeframe on the
  // Effective Ranges screen makes it the denominator of "% of Target".
  // Elemental has no bar — that screen is informational only for them.
  const showTargetBar = profile != null && profile.tier !== 'elemental';
  // With no timeframe chosen, measure against WEEKLY — the smallest real
  // period target. LIMITS.tei.max is a single-SESSION ceiling, so using it
  // here inflated the percentage more than threefold.
  const target = targetForRange(targetRange);
  const targetFraction = showResult
    ? Math.max(0, Math.min(1, result.tei / target))
    : 0;

  /**
   * The rings pass min/max to the arc geometry only, so an impossible value
   * typed straight into a circle used to be scored as if it were legal. Both
   * CTAs run the same bounds check first; the message stays on screen next to
   * the CTA rather than in a transient toast.
   */
  function checkRange(): string | null {
    const problem = validateSessionInputs('standard', {
      sets: session.sets,
      restSeconds: session.restSeconds,
      exertionPercent: session.exertionPercent,
      cardioMinutes: session.cardioMinutes,
    });
    setRangeError(problem);
    return problem;
  }

  // The client considers a TEI above 33 practically unsurvivable, so this
  // almost always means the inputs were misunderstood. `showToast` keeps only
  // the newest message, so the warning is folded into whichever toast each
  // path actually shows rather than fired as a second, doomed one.
  const warning =
    result.tei > LIMITS.tei.implausibleAbove
      ? `TEI ${result.tei.toFixed(0)} is beyond a survivable workload — you may need to review how you are defining your data.`
      : null;

  /** Scores and shows the TEI only — persisting is SAVE's job. */
  function calculate() {
    if (!complete) return;
    // Bring the big number back into view above the keypad.
    lift.collapse();
    setSaveError(null);
    if (checkRange()) {
      setCalculated(false);
      return;
    }
    setCalculated(true);

    // The big number already shows the score; a toast would only cover the
    // buttons. The over-33 warning still needs saying.
    if (warning) showToast(warning);
  }

  async function persist() {
    if (saving) return;
    if (!calculated) {
      showToast('Calculate the TEI before saving.');
      return;
    }
    if (checkRange()) return;
    setSaveError(null);

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
      showToast('Saving sessions needs TEI Basic or Premium.');
      return;
    }

    if (editing) {
      setSaving(true);
      const { error } = await updateSession(editing.id, {
        performedAt: session.date,
        sets: session.sets ?? 0,
        restSeconds: session.restSeconds ?? 0,
        exertionPercent: session.exertionPercent ?? 0,
        cardioMinutes: session.cardioMinutes ?? 0,
        tei: Number(result.tei.toFixed(2)),
      });
      setSaving(false);
      if (error) {
        setSaveError(error);
        return;
      }
      showToast(warning ?? `Session updated — TEI ${result.tei.toFixed(2)}`);
      leaveEdit();
      return;
    }

    if (saved) {
      showToast('This session is already saved.');
      return;
    }

    setSaving(true);
    const { error } = await saveSession({
      userId: profile.id,
      // A date the user picked is when the training happened. Otherwise stamp
      // at save time: `session.date` is only when the draft was created, which
      // for a long-lived app session is not when training happened.
      performedAt: session.dateChosen ? session.date : new Date().toISOString(),
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

  /** Close an opened session: drop the draft and return to Review. */
  function leaveEdit() {
    resetSession();
    router.canGoBack() ? router.back() : router.replace('/review');
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        ref={lift.scrollRef}
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{
          paddingTop: insets.top + 2,
          paddingHorizontal: 20,
          paddingBottom: Math.max(insets.bottom, 12) + 8 + lift.bottomPadding,
          flexGrow: 1,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Ken's 19 Oct 2026 layout: the stacked lockup with the Effective Ranges
            pill under it on the left, and the tall score beside it starting
            level with the back arrow. */}
        <View style={styles.headRow}>
          <View style={styles.headLeft}>
        <BackArrow
          onPress={() => {
            // Leaving an opened session discards any unsaved correction.
            if (editing) {
              leaveEdit();
              return;
            }
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
            <View style={styles.lockup}>
              <Text style={styles.lockupWord}>TOTAL</Text>
              <Text style={styles.lockupWord}>EFFECT</Text>
              <Text style={styles.lockupWord}>INDEX</Text>
              <Text style={styles.lockupTei}>TEI</Text>
            </View>
            {/* Always enabled, on every tier — it replaces the old Ranges CTA. */}
            <Pressable
              onPress={() => router.push('/ranges')}
              accessibilityRole="button"
              accessibilityLabel="Effective Ranges"
              hitSlop={8}
              style={({ pressed }) => [
                styles.pill,
                { borderColor: accent, backgroundColor: pressed ? accentAlpha(accent, 0.16) : 'transparent' },
              ]}
            >
              <Text style={[styles.pillText, { color: accent }]}>Effective Ranges</Text>
            </Pressable>
          </View>

          {showResult ? (
            <MaskedNumber value={displayTei(result.tei)} />
          ) : (
            <Text style={[styles.bigNumber, { color: '#1A1A1A' }]} numberOfLines={1}>
              0
            </Text>
          )}
        </View>

        {showTargetBar && (
          <View style={styles.targetWrap}>
            {/* The percentage and its caption share a baseline row rather than
                stacking — same type sizes, one line of height instead of two. */}
            <View style={styles.targetHead}>
              <Text style={styles.targetPct}>
                {Math.round(targetFraction * 100)}%
              </Text>
              <Text style={styles.targetLabel}>
                of {targetRange ? `${targetRange} Target` : 'Target'}
              </Text>
            </View>
            <View style={styles.targetTrack}>
              <View
                style={[styles.targetFill, { width: `${targetFraction * 100}%` }]}
              />
            </View>
          </View>
        )}

        {/* Session date — the block the keypad lifts to the top */}
        <View style={{ marginTop: 2 }} onLayout={lift.onAnchorLayout}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <CalendarGlyph />
            <Text style={styles.sessionLabel}>
              {editing ? 'Editing Session' : 'This Session'}
            </Text>
            <Ellipsis
              onPress={() => setPickingDate(true)}
              color="#8A8A8A"
              size={20}
              label="Change session date"
            />
          </View>
          <Text style={styles.sessionDate}>{formatSessionDate(session.date)}</Text>
        </View>

        <DatePicker
          visible={pickingDate}
          title="This Session"
          value={new Date(session.date)}
          // A session is logged after the fact, so it can never be in the future.
          maxDate={new Date()}
          withTime
          onCancel={() => setPickingDate(false)}
          onConfirm={(d) => {
            setPickingDate(false);
            setSessionDate(d.toISOString());
          }}
        />

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

        <View style={{ flex: 1, minHeight: 8 }} />

        <View style={{ flexDirection: 'row', gap: 16 }}>
          <OutlineButton
            title="Calculate TEI"
            disabled={!complete}
            onPress={calculate}
            style={styles.ctaBtn}
          />
          {showSave && (
            <OutlineButton
              title={saving ? 'Saving…' : 'SAVE'}
              // Disabled while the keypad is up — the score has to be
              // calculated (which closes the keypad) first.
              disabled={saving || lift.keyboardOpen}
              onPress={persist}
              style={styles.ctaBtn}
            />
          )}
        </View>

        {!showSave && (
          <Pressable
            onPress={() => router.push('/account-type')}
            accessibilityRole="link"
            accessibilityLabel="Upgrade to save your calculations"
            hitSlop={8}
            style={({ pressed }) => [styles.upgrade, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={styles.upgradeText}>
              <Text style={[styles.upgradeLink, { color: accent }]}>Upgrade</Text> to save your
              calculations.
            </Text>
          </Pressable>
        )}

        {rangeError && <Text style={styles.saveError}>{rangeError}</Text>}

        {saveError && (
          <Text style={styles.saveError}>Could not save session: {saveError}</Text>
        )}

        {editing && <DeleteSessionButton id={editing.id} onDeleted={leaveEdit} />}

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
      {/* The keypad lift scrolls content up past the status bar; keep the
          clock on black rather than over the score. */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: colors.bg }}
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

/**
 * The oversized score with the orange-to-charcoal gradient from the mock-ups.
 * RN has no background-clip:text, so the gradient is masked by overlaying it
 * on the glyphs via a transparent-text trick is unavailable — instead the
 * gradient is drawn behind and clipped to the text bounds using a container
 * the same size as the number.
 */
function MaskedNumber({ value }: { value: number }) {
  return (
    <View style={{ flex: 1 }}>
      <Text
        style={[styles.bigNumber, { color: colors.orange }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
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

const styles = StyleSheet.create({
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headLeft: { paddingRight: 8 },
  lockup: { marginTop: 14 },
  lockupWord: { color: '#CFCFCF', fontSize: 15, lineHeight: 17, fontWeight: '600' },
  lockupTei: { color: colors.text, fontSize: 28, lineHeight: 31, fontWeight: '800', letterSpacing: -0.5 },
  pill: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginTop: 14,
  },
  pillText: { fontSize: 13, fontWeight: '600' },
  bigNumber: {
    flex: 1,
    textAlign: 'right',
    // The mock-up's score is roughly as tall as the lockup and the pill
    // together; the keypad lift keeps the rings reachable regardless.
    fontSize: 200,
    fontWeight: '800',
    letterSpacing: -10,
    lineHeight: 190,
    // Negative tracking clips the final glyph without a little breathing room.
    paddingRight: 10,
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
  targetWrap: { marginTop: 0, marginBottom: 0 },
  targetHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  targetPct: { color: colors.text, fontSize: 26, fontWeight: '700', lineHeight: 30 },
  targetLabel: { color: '#C9C9C9', fontSize: 16 },
  targetTrack: {
    height: 10,
    backgroundColor: '#2E2E2E',
    borderRadius: 2,
    marginTop: 5,
    overflow: 'hidden',
  },
  targetFill: { height: 10, backgroundColor: '#8A5A22' },
  sessionLabel: { color: '#C9C9C9', fontSize: 18, marginLeft: 8, marginRight: 8 },
  sessionDate: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '500',
    marginTop: 0,
    lineHeight: 28,
  },
  ringGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    rowGap: 6,
    marginTop: 12,
    marginBottom: 8,
  },
  // Calculate TEI and SAVE share the row at equal width; the trimmed padding
  // keeps "Calculate TEI" on one line on a 375pt-wide phone. Alone (Elemental)
  // Calculate TEI spans the row.
  ctaBtn: { flex: 1, paddingHorizontal: 10 },
  upgrade: { alignSelf: 'center', marginTop: 12 },
  upgradeText: { color: '#A0A0A0', fontSize: 14, lineHeight: 19, textAlign: 'center' },
  upgradeLink: { fontWeight: '600', textDecorationLine: 'underline' },
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
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 8,
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
