import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackArrow, OutlineButton } from '../src/components/Chrome';
import { useAuth } from '../src/auth';
import { listSessionsBetween } from '../src/lib/sessions';
import { listPlansBetween, planDayKey } from '../src/lib/plans';
import { GRADE_COLORS, gradeAgainstPlan } from '../src/lib/tei';
import type { SessionRow } from '../src/lib/database.types';
import { colors, useAccent } from '../src/theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** One calendar cell: a real date plus whether it belongs to the shown month. */
interface Cell {
  date: Date;
  inMonth: boolean;
}

/**
 * BASIC Screen 8 — Review Basic TEI, monthly screen.
 *
 * Modelled on the mock-up (image23): a grey header band carrying the month,
 * a charcoal calendar body where every day is a filled circle showing that
 * day's TEI (or `X` for a rest day), and a grey footer band showing the
 * selected week's total in a green ring.
 *
 * Weeks run Sunday-Saturday and include spill-over days from the adjacent
 * months, so a week total is always a true seven-day total.
 */
export default function Review() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const accent = useAccent();

  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [rows, setRows] = useState<SessionRow[]>([]);
  // Planned TEI for the visible grid, keyed by local YYYY-MM-DD, so each
  // logged day can be graded against the plan it was meant to hit.
  const [planned, setPlanned] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(0);

  // Review is a paid-tier feature; deep-linking here as Elemental must not
  // show the calendar. (The DB also refuses Elemental writes, so there is
  // nothing to leak — this keeps the tier story consistent in the UI.)
  useEffect(() => {
    if (profile && profile.tier === 'elemental') {
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
    // carry their real scores and week totals stay accurate.
    const first = grid[0][0].date;
    const last = grid[grid.length - 1][6].date;
    const from = new Date(
      first.getFullYear(),
      first.getMonth(),
      first.getDate(),
    ).toISOString();
    const to = new Date(
      last.getFullYear(),
      last.getMonth(),
      last.getDate() + 1,
    ).toISOString();

    const { data, error: message } = await listSessionsBetween(from, to);
    setRows(data);
    setError(message);

    // Plans are keyed by calendar day, so the same window is asked for in
    // planDayKey form. A plan failure must not blank the logged scores, so
    // its error only downgrades grading to "ungraded".
    const afterLast = new Date(
      last.getFullYear(),
      last.getMonth(),
      last.getDate() + 1,
    );
    const { data: planRows } = await listPlansBetween(
      planDayKey(first),
      planDayKey(afterLast),
    );
    const totals = new Map<string, number>();
    for (const p of planRows) {
      totals.set(p.planned_for, (totals.get(p.planned_for) ?? 0) + Number(p.tei));
    }
    setPlanned(totals);

    setLoading(false);
  }, []);

  useEffect(() => {
    void load(weeks);
  }, [weeks, load]);

  /** Total TEI keyed by local YYYY-MM-DD. */
  const byDay = useMemo(() => {
    const totals = new Map<string, number>();
    for (const r of rows) {
      const key = dayKey(new Date(r.performed_at));
      totals.set(key, (totals.get(key) ?? 0) + Number(r.tei));
    }
    return totals;
  }, [rows]);

  const weekTotal = useCallback(
    (week: Cell[] | undefined) =>
      (week ?? []).reduce(
        (sum, c) => sum + (byDay.get(dayKey(c.date)) ?? 0),
        0,
      ),
    [byDay],
  );

  function shiftMonth(delta: number) {
    setSelectedWeek(0);
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  }

  const activeWeek = weeks[selectedWeek] ?? weeks[0];
  const weekStart = activeWeek?.[0]?.date;

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
            <Text style={styles.title}>TEI Review - Month</Text>
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
              <Pressable
                key={wi}
                onPress={() => setSelectedWeek(wi)}
                accessibilityRole="button"
                accessibilityLabel={`Week of ${formatWeekOf(week[0].date)}, total ${Math.round(weekTotal(week))} TEI`}
                style={[styles.weekRow, wi > 0 && styles.weekRowDivider]}
              >
                {/* Selected-week marker, as drawn in the mock-up */}
                <View style={styles.selectorSlot}>
                  {selectedWeek === wi && (
                    <View
                      style={[styles.selectorDot, { backgroundColor: accent }]}
                    />
                  )}
                </View>

                <View style={styles.weekCells}>
                  {week.map((cell, di) => {
                    const value = byDay.get(dayKey(cell.date));
                    // Colour the logged score by how it landed against that
                    // day's plan; ungraded days keep GRADE_COLORS.none.
                    const grade = gradeAgainstPlan(
                      value ?? 0,
                      planned.get(planDayKey(cell.date)),
                    );
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
                        <View style={styles.dayCircle}>
                          {value !== undefined ? (
                            <Text
                              style={[
                                styles.dayScore,
                                { color: GRADE_COLORS[grade] },
                              ]}
                            >
                              {Math.round(value)}
                            </Text>
                          ) : cell.inMonth && !isFuture(cell.date) ? (
                            // No session logged: a rest day.
                            <Text style={styles.dayRest}>X</Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </Pressable>
            ))
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
            <View style={[styles.footerDot, { backgroundColor: accent }]} />
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
              Touch any day on the calendar{'\n'}to see the Total TEI for that
              Week.
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
          title="See Ideal Ranges of TEI"
          onPress={() => router.push('/ranges')}
          fontSize={21}
          style={styles.rangesBtn}
        />
      </View>
    </View>
  );
}

/** Local YYYY-MM-DD, so day bucketing follows the device's calendar. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
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
  dayScore: { color: colors.text, fontSize: 19, fontWeight: '700' },
  dayRest: { color: '#4A4A4A', fontSize: 19, fontWeight: '700' },

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
    color: colors.green,
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
});
