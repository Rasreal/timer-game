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
import { BackArrow, Divider } from '../src/components/Chrome';
import { listSessionsBetween } from '../src/lib/sessions';
import type { SessionRow } from '../src/lib/database.types';
import { colors } from '../src/theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * BASIC Screen 8 — Review TEI, monthly view.
 *
 * An iCal-style month grid showing each day's total TEI, plus per-week
 * aggregates. Reads from the `sessions` table; RLS limits it to the signed-in
 * user's own rows.
 */
export default function Review() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  const load = useCallback(async (monthStart: Date) => {
    setLoading(true);
    setError(null);

    const from = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth(),
      1,
    ).toISOString();
    const to = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + 1,
      0,
      23,
      59,
      59,
    ).toISOString();

    const { data, error: message } = await listSessionsBetween(from, to);
    setRows(data);
    setError(message);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(cursor);
  }, [cursor, load]);

  /** Total TEI per day-of-month. */
  const byDay = useMemo(() => {
    const totals = new Map<number, number>();
    for (const r of rows) {
      const day = new Date(r.performed_at).getDate();
      totals.set(day, (totals.get(day) ?? 0) + Number(r.tei));
    }
    return totals;
  }, [rows]);

  /** The month laid out as calendar weeks, padded with nulls. */
  const weeks = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (number | null)[] = [
      ...Array<null>(firstWeekday).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);

    const out: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7));
    return out;
  }, [cursor]);

  const monthTotal = useMemo(
    () => rows.reduce((sum, r) => sum + Number(r.tei), 0),
    [rows],
  );

  const weekTotal = (week: (number | null)[]) =>
    week.reduce<number>((sum, d) => sum + (d ? (byDay.get(d) ?? 0) : 0), 0);

  function shiftMonth(delta: number) {
    setSelectedWeek(null);
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  }

  const monthLabel = cursor.toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingHorizontal: 20,
        paddingBottom: Math.max(insets.bottom, 20) + 20,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <BackArrow onPress={() => router.replace('/home')} />
        <Text style={styles.title}>TEI Review – Month</Text>
      </View>

      <View style={styles.monthRow}>
        <Pressable
          onPress={() => shiftMonth(-1)}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          hitSlop={12}
        >
          <Text style={styles.monthArrow}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <Pressable
          onPress={() => shiftMonth(1)}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          hitSlop={12}
        >
          <Text style={styles.monthArrow}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((d, i) => (
          <Text key={`${d}-${i}`} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>

      <Divider style={{ marginBottom: 4 }} />

      {loading ? (
        <ActivityIndicator
          color={colors.orange}
          style={{ marginVertical: 40 }}
        />
      ) : (
        weeks.map((week, wi) => {
          const total = weekTotal(week);
          const selected = selectedWeek === wi;
          return (
            <Pressable
              key={wi}
              onPress={() => setSelectedWeek(selected ? null : wi)}
              accessibilityRole="button"
              accessibilityLabel={`Week ${wi + 1}, total ${total.toFixed(0)} TEI`}
              style={[styles.weekRow, selected && styles.weekRowSelected]}
            >
              {week.map((day, di) => {
                const value = day ? byDay.get(day) : undefined;
                return (
                  <View key={di} style={styles.dayCell}>
                    <Text style={[styles.dayNum, !day && { opacity: 0 }]}>
                      {day ?? 0}
                    </Text>
                    <View style={styles.dayDot}>
                      {value !== undefined && (
                        <Text style={styles.dayScore}>{Math.round(value)}</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </Pressable>
          );
        })
      )}

      {selectedWeek !== null && !loading && (
        <Text style={styles.weekTotal}>
          Week total:{' '}
          <Text style={{ color: colors.orange, fontWeight: '700' }}>
            {weekTotal(weeks[selectedWeek]).toFixed(0)} TEI
          </Text>
        </Text>
      )}

      <Divider style={{ marginTop: 16 }} />

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>Month Total</Text>
        <Text style={styles.footerValue}>{monthTotal.toFixed(0)}</Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {!loading && rows.length === 0 && !error && (
        <Text style={styles.empty}>
          No sessions logged this month. Calculate a session and save it to see
          it here.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
    paddingRight: 24,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 14,
    paddingHorizontal: 6,
  },
  monthArrow: { color: colors.orange, fontSize: 34, fontWeight: '300' },
  monthLabel: { color: colors.text, fontSize: 24, fontWeight: '600' },
  weekdayRow: { flexDirection: 'row', marginBottom: 6 },
  weekday: {
    flex: 1,
    textAlign: 'center',
    color: '#8A8A8A',
    fontSize: 13,
    fontWeight: '700',
  },
  weekRow: {
    flexDirection: 'row',
    borderRadius: 8,
    paddingVertical: 4,
  },
  weekRowSelected: { backgroundColor: '#161616' },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  dayNum: { color: colors.text, fontSize: 15, fontWeight: '500' },
  dayDot: {
    marginTop: 3,
    minWidth: 26,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayScore: { color: colors.orange, fontSize: 12, fontWeight: '700' },
  weekTotal: {
    color: colors.text,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
  },
  footerLabel: { color: '#C9C9C9', fontSize: 18 },
  footerValue: {
    color: colors.orange,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
  },
  error: { color: colors.red, fontSize: 13.5, marginTop: 14 },
  empty: {
    color: '#7A7A7A',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 18,
    textAlign: 'center',
  },
});
