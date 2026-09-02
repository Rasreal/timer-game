import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
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
import { BackArrow, OutlineButton } from '../src/components/Chrome';
import { useAuth } from '../src/auth';
import { listPlansBetween, planDayKey, type PlanRow } from '../src/lib/plans';
import { colors, useAccent } from '../src/theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** One calendar cell: a real date plus whether it belongs to the shown month. */
interface Cell {
  date: Date;
  inMonth: boolean;
}

/**
 * PREMIUM Screen 20 — Plan TEI, monthly screen.
 *
 * The planning twin of the Review calendar (app/review.tsx): same grey
 * header/charcoal body/grey footer bands, but the day circles carry planned
 * TEI in orange and the week ring is yellow, marking intent rather than
 * recorded work.
 *
 * Weeks run Sunday-Saturday and include spill-over days from the adjacent
 * months, so a week total is always a true seven-day total.
 */
export default function Plan() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const accent = useAccent();

  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [pending, setPending] = useState<Cell | null>(null);

  // Planning is Premium-only. `profile` is null while it loads, so gate on a
  // loaded profile rather than bouncing every visitor through /home first.
  useEffect(() => {
    if (profile && profile.tier !== 'premium') {
      router.replace('/home');
    }
  }, [profile, router]);

  /** The month as 6 weeks of 7 real dates, including adjacent-month spill. */
  const weeks = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();

    // Back up to the Sunday on or before the 1st.
    const start = new Date(year, month, 1);
    start.setDate(start.getDate() - start.getDay());

    const out: Cell[][] = [];
    const d = new Date(start);
    // Six rows always covers a month; trailing all-spill rows are dropped.
    for (let w = 0; w < 6; w++) {
      const week: Cell[] = [];
      for (let i = 0; i < 7; i++) {
        week.push({ date: new Date(d), inMonth: d.getMonth() === month });
        d.setDate(d.getDate() + 1);
      }
      out.push(week);
      if (week.every((c) => !c.inMonth) && w > 3) {
        out.pop();
        break;
      }
    }
    return out;
  }, [cursor]);

  const load = useCallback(async (grid: Cell[][]) => {
    setLoading(true);
    setError(null);

    // Query the whole visible grid, not just the month, so spill-over days
    // carry their real plans and week totals stay accurate.
    const first = grid[0][0].date;
    const last = grid[grid.length - 1][6].date;
    // The range is half-open, so ask for the day after the final cell.
    const afterLast = new Date(
      last.getFullYear(),
      last.getMonth(),
      last.getDate() + 1,
    );

    const { data, error: message } = await listPlansBetween(
      planDayKey(first),
      planDayKey(afterLast),
    );
    setRows(data);
    setError(message);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(weeks);
  }, [weeks, load]);

  /** Planned TEI keyed by local YYYY-MM-DD. */
  const byDay = useMemo(() => {
    const totals = new Map<string, number>();
    for (const r of rows) {
      totals.set(r.planned_for, (totals.get(r.planned_for) ?? 0) + Number(r.tei));
    }
    return totals;
  }, [rows]);

  const weekTotal = useCallback(
    (week: Cell[] | undefined) =>
      (week ?? []).reduce(
        (sum, c) => sum + (byDay.get(planDayKey(c.date)) ?? 0),
        0,
      ),
    [byDay],
  );

  function shiftMonth(delta: number) {
    setSelectedWeek(0);
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  }

  /** Row index of the week containing a date, for the "See Week Total" path. */
  function weekIndexOf(date: Date): number {
    const key = planDayKey(date);
    const found = weeks.findIndex((w) =>
      w.some((c) => planDayKey(c.date) === key),
    );
    return found === -1 ? selectedWeek : found;
  }

  const activeWeek = weeks[selectedWeek] ?? weeks[0];
  const weekStart = activeWeek?.[0]?.date;
  const monthHasPlans = weeks.some((w) =>
    w.some((c) => c.inMonth && byDay.has(planDayKey(c.date))),
  );

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 0 }}
        stickyHeaderIndices={[0]}
      >
        {/* ---------- Grey header band ---------- */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <View style={styles.titleRow}>
            <BackArrow onPress={() => router.replace('/home')} />
            <Text style={styles.title}>Plan TEI - Month</Text>
            <View style={{ width: 30 }} />
          </View>

          <View style={styles.monthRow}>
            <Text style={styles.monthLabel}>
              {cursor.toLocaleString('en-US', { month: 'long' })}{' '}
              <Text style={{ color: colors.orange }}>{cursor.getFullYear()}</Text>
            </Text>
            <View style={styles.monthArrows}>
              <Pressable
                onPress={() => shiftMonth(-1)}
                accessibilityRole="button"
                accessibilityLabel="Previous month"
                hitSlop={14}
              >
                <Text style={[styles.monthArrow, { color: accent }]}>←</Text>
              </Pressable>
              <Pressable
                onPress={() => shiftMonth(1)}
                accessibilityRole="button"
                accessibilityLabel="Next month"
                hitSlop={14}
                style={{ marginLeft: 22 }}
              >
                <Text style={[styles.monthArrow, { color: accent }]}>→</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((d, i) => (
              <Text key={`${d}-${i}`} style={styles.weekday}>
                {d}
              </Text>
            ))}
          </View>
        </View>

        {/* ---------- Calendar body ---------- */}
        <View style={styles.body}>
          {loading ? (
            <ActivityIndicator
              color={colors.orange}
              size="large"
              style={{ marginVertical: 90 }}
            />
          ) : (
            weeks.map((week, wi) => (
              // A View, not a Pressable: each day circle below is its own tap
              // target, and nesting buttons is invalid on web. Selecting the
              // week is done by the marker slot on the left.
              <View
                key={wi}
                style={[styles.weekRow, wi > 0 && styles.weekRowDivider]}
              >
                <Pressable
                  onPress={() => setSelectedWeek(wi)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select week of ${formatWeekOf(week[0].date)}, planned total ${Math.round(weekTotal(week))} TEI`}
                  hitSlop={10}
                  style={styles.selectorSlot}
                >
                  {selectedWeek === wi && <View style={styles.selectorDot} />}
                </Pressable>

                <View style={styles.weekCells}>
                  {week.map((cell, di) => {
                    const value = byDay.get(planDayKey(cell.date));
                    return (
                      <View key={di} style={styles.dayCell}>
                        <Text
                          style={[
                            styles.dayNum,
                            !cell.inMonth && styles.dayNumMuted,
                          ]}
                        >
                          {cell.date.getDate()}
                        </Text>
                        <Pressable
                          // Planning a day that has already gone is
                          // meaningless, so past days are not tappable.
                          onPress={
                            isPast(cell.date) ? undefined : () => setPending(cell)
                          }
                          disabled={isPast(cell.date)}
                          accessibilityRole="button"
                          accessibilityLabel={
                            isPast(cell.date)
                              ? `${formatWeekOf(cell.date)}, in the past — cannot be planned`
                              : value !== undefined
                              ? `${formatWeekOf(cell.date)}, ${Math.round(value)} TEI planned`
                              : `${formatWeekOf(cell.date)}, no TEI planned`
                          }
                          style={[
                            styles.dayCircle,
                            isPast(cell.date) && styles.dayCirclePast,
                          ]}
                        >
                          {value !== undefined ? (
                            <Text style={[styles.dayScore, { color: accent }]}>
                              {Math.round(value)}
                            </Text>
                          ) : cell.inMonth &&
                            !isFuture(cell.date) &&
                            !isPast(cell.date) ? (
                            // Past day that was never planned: nothing to design.
                            <Text style={styles.dayRest}>X</Text>
                          ) : null}
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))
          )}

          {!loading && !monthHasPlans && (
            <Text style={styles.empty}>
              Nothing planned this month yet — touch a day to design its Target
              TEI.
            </Text>
          )}
        </View>
      </ScrollView>

      {/* ---------- Grey footer band ---------- */}
      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 16) + 14 },
        ]}
      >
        <View style={styles.footerTop}>
          <View style={styles.footerDotWrap}>
            <View style={styles.footerDot} />
          </View>

          <View style={{ flex: 1, marginLeft: 4 }}>
            {/* The rule runs from the marker across to the ring, under the
                label, exactly as drawn in the mock-up. */}
            <View style={styles.footerLabelRow}>
              <View style={styles.footerLine} />
              <Text style={styles.footerLabel}>TEI Total Week of</Text>
            </View>
            <Text style={styles.footerDate}>
              {weekStart ? formatWeekOfSplit(weekStart).month : ''}{' '}
              <Text style={{ color: '#B8B8B8' }}>
                {weekStart ? formatWeekOfSplit(weekStart).year : ''}
              </Text>
            </Text>
            <Text style={styles.footerHint}>
              Touch any day on the calendar{'\n'}to design that day&rsquo;s
              Target TEI.
            </Text>
          </View>

          <View style={styles.totalRing}>
            <View style={styles.totalRingInner}>
              <Text style={styles.totalValue}>
                {Math.round(weekTotal(activeWeek))}
              </Text>
              <Text style={styles.totalUnit}>TEI</Text>
            </View>
          </View>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <OutlineButton
          title="See Effective Ranges of TEI"
          onPress={() => router.push('/ranges')}
          fontSize={21}
          style={styles.rangesBtn}
        />
      </View>

      {/* ---------- Day-tap confirm ---------- */}
      <Modal
        visible={pending !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setPending(null)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Pressable
                onPress={() => setPending(null)}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                hitSlop={14}
              >
                <Text style={[styles.sheetClose, { color: accent }]}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.sheetBody}>
              Would you like to plan Your TEI for{' '}
              <Text style={{ color: colors.orange }}>
                {pending ? formatWeekOf(pending.date) : ''}
              </Text>
              , or see the Total TEI you have already planned for that week?
            </Text>

            <OutlineButton
              title="Plan My TEI"
              onPress={() => {
                const cell = pending;
                setPending(null);
                if (cell) {
                  router.push(
                    ('/planner?start=' + planDayKey(cell.date)) as never,
                  );
                }
              }}
              fontSize={19}
              style={styles.sheetBtn}
            />
            <OutlineButton
              title="See Week Total"
              onPress={() => {
                const cell = pending;
                setPending(null);
                if (cell) setSelectedWeek(weekIndexOf(cell.date));
              }}
              fontSize={19}
              style={styles.sheetBtn}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** True for a day that has already finished — you cannot plan the past. */
function isPast(d: Date): boolean {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return d.getTime() < startOfToday.getTime();
}

function isFuture(d: Date): boolean {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return d.getTime() > today.getTime();
}

function formatWeekOf(d: Date): string {
  return `${d.toLocaleString('en-US', { month: 'long' })} ${d.getDate()}, ${d.getFullYear()}`;
}

/** Split so the year can be tinted separately, as in the mock-up. */
function formatWeekOfSplit(d: Date): { month: string; year: string } {
  return {
    month: `${d.toLocaleString('en-US', { month: 'long' })} ${d.getDate()},`,
    year: String(d.getFullYear()),
  };
}

const GREY_BAND = '#6E6E6E';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#2B2B2B' },

  header: { backgroundColor: GREY_BAND, paddingHorizontal: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 23,
    fontWeight: '700',
    textAlign: 'center',
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  monthLabel: {
    color: colors.text,
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1,
  },
  monthArrows: { flexDirection: 'row', alignItems: 'center' },
  monthArrow: { fontSize: 27 },
  weekdayRow: { flexDirection: 'row', marginTop: 10, paddingLeft: 22 },
  weekday: {
    flex: 1,
    textAlign: 'center',
    color: '#C9C9C9',
    fontSize: 15,
    fontWeight: '600',
  },

  body: { backgroundColor: '#2B2B2B', paddingBottom: 8 },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 6,
  },
  weekRowDivider: { borderTopWidth: 1, borderTopColor: '#3D3D3D' },
  selectorSlot: { width: 16, alignItems: 'center' },
  selectorDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.green,
  },
  weekCells: { flex: 1, flexDirection: 'row' },
  dayCell: { flex: 1, alignItems: 'center' },
  dayNum: { color: colors.text, fontSize: 15, fontWeight: '500' },
  dayNumMuted: { color: '#7E7E7E' },
  dayCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  dayScore: { fontSize: 19, fontWeight: '700' },
  // Past days are dimmed to show they are not plannable.
  dayCirclePast: { opacity: 0.45 },
  dayRest: { color: '#4A4A4A', fontSize: 19, fontWeight: '700' },
  empty: {
    color: '#9E9E9E',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 12,
  },

  footer: {
    backgroundColor: GREY_BAND,
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  footerTop: { flexDirection: 'row', alignItems: 'center' },
  footerDotWrap: { width: 18, alignItems: 'center' },
  footerDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: colors.green,
    borderWidth: 2.5,
    borderColor: '#1A1A1A',
  },
  footerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#4A4A4A',
    marginRight: 8,
  },
  footerLabel: {
    color: '#4C4C4C',
    fontSize: 19,
    fontWeight: '700',
    paddingRight: 6,
  },
  footerDate: {
    color: colors.text,
    fontSize: 27,
    fontWeight: '700',
    marginTop: 1,
  },
  footerHint: {
    color: '#9E9E9E',
    fontSize: 15,
    lineHeight: 19,
    marginTop: 4,
  },

  totalRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#3A3A3A',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  totalRingInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalValue: {
    color: colors.yellow,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
  },
  totalUnit: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: -3,
  },

  rangesBtn: {
    marginTop: 14,
    backgroundColor: '#151515',
    borderRadius: 8,
  },
  error: { color: '#FFD2D2', fontSize: 13, marginTop: 10 },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  sheet: {
    backgroundColor: '#0D0D0D',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2E2E2E',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sheetHead: { alignItems: 'flex-end', paddingTop: 10 },
  sheetClose: { fontSize: 26, fontWeight: '300' },
  sheetBody: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 25,
    marginBottom: 18,
  },
  sheetBtn: { marginTop: 10, backgroundColor: '#151515', borderRadius: 8 },
});
