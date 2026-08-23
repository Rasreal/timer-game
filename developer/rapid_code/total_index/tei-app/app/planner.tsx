import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackArrow, DarkButton, Divider } from '../src/components/Chrome';
import { useAuth } from '../src/auth';
import { useStore } from '../src/store';
import {
  clearPlan,
  listPlansBetween,
  planDayKey,
  savePlan,
  type PlanRow,
} from '../src/lib/plans';
import type { CalculatorId } from '../src/lib/tei';
import { colors } from '../src/theme';

const DAYS = 7;

/**
 * TEI PREMIUM Screen 21 — "TEI - 7 Day Planner".
 *
 * Seven rows, one per day from the start date forward, each showing that day's
 * planned TEI and the four headline variables. Values come from the `plans`
 * table; a day with no row shows the mock-up's unplanned state ("-----" and
 * "X"), and tapping its ring sends the user to the session-type selector to
 * build the plan there — this screen has no inputs of its own.
 */
export default function Planner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, session } = useAuth();
  const { showToast } = useStore();
  const params = useLocalSearchParams<{ start?: string }>();

  // The start date is state, not a derived value: answering YES to "plan
  // another week" advances it in place rather than re-navigating.
  const [start, setStart] = useState<Date>(() => parseDayParam(params.start));
  const [plans, setPlans] = useState<Record<string, PlanRow>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState<string | null>(null);
  const [askAnotherWeek, setAskAnotherWeek] = useState(false);

  // Planning is Premium-only. `profile` is null while it loads, so gate only
  // once it has arrived — otherwise a deep link bounces before the tier is known.
  useEffect(() => {
    if (profile && profile.tier !== 'premium') {
      router.replace('/home');
    }
  }, [profile, router]);

  /** The seven visible days, Day 1 being the start date. */
  const days = useMemo(() => {
    const out: Date[] = [];
    for (let i = 0; i < DAYS; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      out.push(d);
    }
    return out;
  }, [start]);

  const load = useCallback(async (window: Date[]) => {
    setLoading(true);
    setError(null);

    // listPlansBetween is half-open, so the upper bound is the day after Day 7.
    const after = new Date(window[window.length - 1]);
    after.setDate(after.getDate() + 1);

    const { data, error: err } = await listPlansBetween(
      planDayKey(window[0]),
      planDayKey(after),
    );

    if (err) {
      setError(err);
      setPlans({});
    } else {
      const byDay: Record<string, PlanRow> = {};
      for (const row of data) byDay[row.planned_for] = row;
      setPlans(byDay);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(days);
  }, [days, load]);

  const total = useMemo(
    () =>
      days.reduce((sum, d) => {
        const row = plans[planDayKey(d)];
        return sum + (row ? row.tei : 0);
      }, 0),
    [days, plans],
  );

  const plannedCount = days.filter((d) => plans[planDayKey(d)]).length;

  function pickDate() {
    showToast('Date picking is not wired up in the prototype.');
  }

  function openDay(day: Date) {
    // /session-type is not in the generated typed-routes union with a param.
    router.push(`/session-type?plan=${planDayKey(day)}` as never);
  }

  /** Delete one planned day, dropping it from the visible week on success. */
  async function clearDay(day: Date) {
    const userId = session?.user.id;
    const key = planDayKey(day);
    if (!userId || clearing) return;

    setClearing(key);
    const { error: err } = await clearPlan(userId, key);
    setClearing(null);

    if (err) {
      showToast(err);
      return;
    }
    setPlans((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    showToast('Plan cleared.');
  }

  async function save() {
    const userId = session?.user.id;
    if (!userId || saving) return;

    const planned = days
      .map((d) => plans[planDayKey(d)])
      .filter((row): row is PlanRow => Boolean(row));

    if (planned.length === 0) {
      showToast('Nothing planned yet — tap a day to plan it.');
      return;
    }

    setSaving(true);
    let failure: string | null = null;
    for (const row of planned) {
      const { error: err } = await savePlan({
        userId,
        plannedFor: row.planned_for,
        tei: row.tei,
        calculator: row.calculator as CalculatorId,
        sets: row.sets,
        restSeconds: row.rest_seconds,
        exertionPercent: row.exertion_percent,
        cardioMinutes: row.cardio_minutes,
        breakdowns: row.breakdowns,
        exercises: row.exercises,
        circuits: row.circuits,
        yogaMinutes: row.yoga_minutes,
      });
      if (err) {
        failure = err;
        break;
      }
    }
    setSaving(false);

    if (failure) {
      showToast(failure);
      return;
    }
    setAskAnotherWeek(true);
  }

  function planAnotherWeek() {
    setAskAnotherWeek(false);
    // Day 8 becomes the next week's Day 1; the days/load effect refetches.
    setStart((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + DAYS);
      return next;
    });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.orange }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 22,
          paddingBottom: Math.max(insets.bottom, 20) + 24,
        }}
      >
        <View style={styles.headerRow}>
          <BackArrow onPress={() => router.canGoBack() ? router.back() : router.replace('/plan')} color="#7A4A12" />
          <Text style={styles.heading}>TEI - 7 Day Planner</Text>
          {/* Balances the chevron so the heading stays optically centred. */}
          <View style={styles.headerSpacer} />
        </View>

        <Divider style={styles.headingRule} />

        <Pressable
          onPress={pickDate}
          accessibilityRole="button"
          accessibilityLabel={`Start date, ${longDate(start)}`}
          style={({ pressed }) => [styles.startRow, { opacity: pressed ? 0.7 : 1 }]}
        >
          <CalendarGlyph />
          <Text style={styles.startLabel}>Start Date:</Text>
          <Text style={styles.startValue}>{longDate(start)}</Text>
        </Pressable>

        {loading ? (
          <ActivityIndicator color="#3A2308" style={{ marginTop: 48 }} />
        ) : (
          <>
            {error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.dayList}>
              {days.map((day, i) => (
                <DayRow
                  key={planDayKey(day)}
                  index={i + 1}
                  date={day}
                  plan={plans[planDayKey(day)]}
                  onPress={() => openDay(day)}
                  onClear={() => void clearDay(day)}
                  clearing={clearing === planDayKey(day)}
                />
              ))}
            </View>

            <View style={styles.footer}>
              <View style={styles.footerLeft}>
                <Text style={styles.totalLabel}>This 7 DAY Total TEI</Text>
                <Divider style={styles.totalRule} />
                <DarkButton
                  title={saving ? 'Saving…' : 'Save this PLAN'}
                  onPress={() => void save()}
                  disabled={saving}
                  style={styles.saveBtn}
                />
              </View>
              <Bevel size={120} label={`Seven day total, ${total} TEI`}>
                <Text style={styles.totalValue}>
                  {plannedCount > 0 ? formatTei(total) : ''}
                </Text>
                <Text style={styles.ringCaption}>TEI</Text>
              </Bevel>
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        visible={askAnotherWeek}
        transparent
        animationType="fade"
        onRequestClose={() => setAskAnotherWeek(false)}
      >
        <View style={styles.modalScrim}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Plan saved</Text>
            <Text style={styles.modalBody}>
              Would you like to plan another week?
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setAskAnotherWeek(false);
                  router.replace('/home');
                }}
                accessibilityRole="button"
                accessibilityLabel="No, return home"
                style={({ pressed }) => [
                  styles.modalBtn,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={styles.modalBtnText}>NO</Text>
              </Pressable>
              <Pressable
                onPress={planAnotherWeek}
                accessibilityRole="button"
                accessibilityLabel="Yes, plan the next seven days"
                style={({ pressed }) => [
                  styles.modalBtn,
                  styles.modalBtnPrimary,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.modalBtnText, styles.modalBtnTextPrimary]}>
                  YES
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DayRow({
  index,
  date,
  plan,
  onPress,
  onClear,
  clearing = false,
}: {
  index: number;
  date: Date;
  plan: PlanRow | undefined;
  onPress: () => void;
  onClear: () => void;
  clearing?: boolean;
}) {
  const label = plan
    ? `Day ${index}, ${longDate(date)}, ${plan.tei} TEI. Change this plan.`
    : `Day ${index}, ${longDate(date)}, not planned. Plan this day.`;

  return (
    <View style={styles.dayRow}>
      <View style={styles.dayRowLeft}>
        <View style={styles.dayTitleRow}>
          <Text style={styles.dayTitle}>
            Day {index}:{' '}
            <Text style={plan ? styles.dayDate : styles.dayDateEmpty}>
              {plan ? shortDate(date) : '-----'}
            </Text>
          </Text>

          {/* Only a planned day can be un-planned. */}
          {plan && (
            <Pressable
              onPress={onClear}
              disabled={clearing}
              accessibilityRole="button"
              accessibilityLabel={`Clear the plan for Day ${index}, ${longDate(date)}`}
              hitSlop={10}
              style={({ pressed }) => [
                styles.clearBtn,
                { opacity: pressed || clearing ? 0.55 : 1 },
              ]}
            >
              <Text style={styles.clearText}>
                {clearing ? '…' : 'CLEAR'}
              </Text>
            </Pressable>
          )}
        </View>

        <Divider style={styles.dayRule} />

        <View style={styles.varRow}>
          <VarCell value={plan?.sets} label="Sets" />
          <VarCell value={plan?.rest_seconds} label="Seconds" />
          <VarCell value={plan?.exertion_percent} label="% Exert" />
          <VarCell value={plan?.cardio_minutes} label="Minutes" />
        </View>
      </View>

      <Bevel size={78} onPress={onPress} label={label}>
        <Text style={plan ? styles.dayTei : styles.dayTeiEmpty}>
          {plan ? formatTei(plan.tei) : '•••'}
        </Text>
        <Text style={styles.ringCaption}>TEI</Text>
      </Bevel>
    </View>
  );
}

/** One variable column: the big value over its small caption. */
function VarCell({ value, label }: { value: number | null | undefined; label: string }) {
  return (
    <View style={styles.varCell}>
      <Text style={styles.varValue}>{value === null || value === undefined ? 'X' : value}</Text>
      <Text style={styles.varLabel}>{label}</Text>
    </View>
  );
}

/**
 * The bevelled disc used for both the per-day and the total rings — a graphite
 * rim with a darker inner well, matching the discs on the other orange screens.
 * Rendered as a plain View when there is nothing to tap (the total).
 */
function Bevel({
  size,
  children,
  onPress,
  label,
}: {
  size: number;
  children: React.ReactNode;
  onPress?: () => void;
  label: string;
}) {
  const inset = Math.round(size * 0.09);
  const shape = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };
  const well = (
    <>
      <View
        style={[
          styles.bevelWell,
          { top: inset, left: inset, right: inset, bottom: inset },
        ]}
      />
      <View style={styles.bevelContent}>{children}</View>
    </>
  );

  if (!onPress) {
    return (
      <View
        accessible
        accessibilityLabel={label}
        style={[styles.bevelOuter, shape]}
      >
        {well}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.bevelOuter,
        shape,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {well}
    </Pressable>
  );
}

/** A calendar icon drawn from Views, so the prototype ships no icon font. */
function CalendarGlyph() {
  return (
    <View style={styles.calGlyph}>
      <View style={styles.calTabs}>
        <View style={styles.calTab} />
        <View style={styles.calTab} />
      </View>
      <View style={styles.calBody}>
        {[0, 1, 2].map((row) => (
          <View key={row} style={styles.calDotRow}>
            {[0, 1, 2].map((col) => (
              <View key={col} style={styles.calDot} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * `start` arrives as a YYYY-MM-DD query param. It is parsed field-by-field
 * rather than with `new Date(string)`, which would read it as UTC midnight and
 * land on the previous day west of Greenwich.
 */
function parseDayParam(raw: string | undefined): Date {
  const match = raw?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** "May 4, 2026" — the start-date headline. */
function longDate(d: Date): string {
  return `${d.toLocaleString('en-US', { month: 'long' })} ${d.getDate()}, ${d.getFullYear()}`;
}

/** "May 4" — compact enough to sit inside a day row's rule. */
function shortDate(d: Date): string {
  return `${d.toLocaleString('en-US', { month: 'short' })} ${d.getDate()}`;
}

/** TEI is stored as a float; whole numbers read better in the small rings. */
function formatTei(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heading: {
    flex: 1,
    color: '#111',
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  headerSpacer: { width: 24 },
  headingRule: {
    backgroundColor: '#8A5A22',
    marginTop: 4,
    marginHorizontal: 30,
  },
  startRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  startLabel: {
    color: '#2A2A2A',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  startValue: {
    flex: 1,
    color: '#111',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  error: {
    color: '#5A1A00',
    fontSize: 14,
    marginTop: 16,
  },
  dayList: { marginTop: 26, gap: 20 },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayRowLeft: { flex: 1 },
  dayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#3A2308',
  },
  clearText: {
    color: colors.orange,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dayTitle: {
    color: '#111',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  dayDate: { fontWeight: '700' },
  dayDateEmpty: { fontWeight: '700', letterSpacing: 1 },
  dayRule: {
    backgroundColor: '#3A2308',
    marginTop: 3,
  },
  varRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  varCell: {
    flex: 1,
    alignItems: 'center',
  },
  varValue: {
    color: '#111',
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  varLabel: {
    color: '#1A1A1A',
    fontSize: 12,
    fontWeight: '600',
    marginTop: -1,
  },
  bevelOuter: {
    backgroundColor: '#242424',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  bevelWell: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#17100A',
  },
  bevelContent: { alignItems: 'center' },
  dayTei: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  dayTeiEmpty: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 1.5,
    lineHeight: 20,
  },
  ringCaption: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginTop: 1,
  },
  totalValue: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 30,
    gap: 10,
  },
  footerLeft: { flex: 1 },
  totalLabel: {
    color: '#111',
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  totalRule: {
    backgroundColor: '#3A2308',
    marginTop: 3,
  },
  saveBtn: {
    marginTop: 14,
    alignSelf: 'center',
    minWidth: 210,
    paddingVertical: 13,
  },
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.surface2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    padding: 22,
  },
  modalTitle: {
    color: colors.orange,
    fontSize: 20,
    fontWeight: '800',
  },
  modalBody: {
    color: colors.text,
    fontSize: 16,
    marginTop: 10,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 22,
    gap: 12,
  },
  modalBtn: {
    paddingVertical: 11,
    paddingHorizontal: 24,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#4A4A4A',
  },
  modalBtnPrimary: { borderColor: colors.orange },
  modalBtnText: {
    color: colors.textDim,
    fontSize: 16,
    fontWeight: '700',
  },
  modalBtnTextPrimary: { color: colors.orange },
  calGlyph: { width: 34, alignItems: 'center' },
  calTabs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: -2,
  },
  calTab: {
    width: 4,
    height: 6,
    borderRadius: 2,
    backgroundColor: '#111',
  },
  calBody: {
    width: 34,
    height: 30,
    borderRadius: 4,
    borderWidth: 3,
    borderColor: '#111',
    paddingHorizontal: 3,
    paddingVertical: 3,
    justifyContent: 'space-between',
  },
  calDotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calDot: {
    width: 5,
    height: 4,
    backgroundColor: '#111',
  },
});
