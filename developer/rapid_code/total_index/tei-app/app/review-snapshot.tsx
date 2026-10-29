import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BackArrow } from '../src/components/Chrome';
import { useAuth } from '../src/auth';
import { listSessionsBetween } from '../src/lib/sessions';
import {
  previousFullWeekStart,
  reviewDayKey,
  sessionsByDay,
  sumTei,
  weekDates,
} from '../src/lib/review';
import { LIMITS } from '../src/lib/tei';
import type { SessionRow } from '../src/lib/database.types';
import { colors, useAccent } from '../src/theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const CHART_HEIGHT = 170;
const TICKS = [0, 5, 10, 15, 20, 25];

/**
 * "SNAPSHOT of previous full week" (Ken's 22 Oct 2026 edits): one bar per day
 * of the last finished Sunday-to-Saturday week and the week's total TEI in the
 * big gradient numerals. Deliberately bare — a quick visual reference.
 */
export default function ReviewSnapshot() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const accent = useAccent();

  const start = useMemo(() => previousFullWeekStart(), []);
  const days = useMemo(() => weekDates(start), [start]);
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile && profile.tier === 'elemental') {
      router.replace('/home');
      return;
    }
    let cancelled = false;
    const after = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
    void listSessionsBetween(start.toISOString(), after.toISOString()).then(
      ({ data, error: message }) => {
        if (cancelled) return;
        setRows(data);
        setError(message);
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [profile, router, start]);

  const byDay = useMemo(() => sessionsByDay(rows), [rows]);
  const dayTotals = days.map((d) => sumTei(byDay.get(reviewDayKey(d)) ?? []));
  // The axis stops at 25 as drawn, unless a day ran past it.
  const scaleMax = Math.max(25, ...dayTotals);
  const total = Math.round(sumTei(rows));

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 16) + 10 },
      ]}
    >
      <View style={styles.headRow}>
        <BackArrow onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
        <Text style={styles.tei}>TEI</Text>
      </View>
      <Text style={styles.weekOf}>Week of {weekLabel(start)}</Text>

      {loading ? (
        <ActivityIndicator color={accent} style={{ marginTop: 80 }} />
      ) : (
        <>
          <View style={styles.chart}>
            <View style={styles.axis}>
              {[...TICKS].reverse().map((t) => (
                <Text
                  key={t}
                  style={[styles.tick, { bottom: (t / scaleMax) * CHART_HEIGHT - 7 }]}
                >
                  {t}
                </Text>
              ))}
            </View>
            <View style={styles.bars}>
              {days.map((d, i) => {
                const value = dayTotals[i];
                const height = (value / scaleMax) * CHART_HEIGHT;
                return (
                  <View key={reviewDayKey(d)} style={styles.barCol}>
                    <View style={styles.barSlot}>
                      {value > 0 && (
                        <LinearGradient
                          testID={`snapshot-bar-${i}`}
                          accessibilityLabel={`${d.toLocaleString('en-US', { weekday: 'long' })}, ${Math.round(value)} TEI`}
                          colors={[
                            value > LIMITS.tei.overAt ? colors.red : accent,
                            'rgba(60,60,60,0.9)',
                          ]}
                          style={[styles.bar, { height }]}
                        />
                      )}
                    </View>
                    <Text style={styles.barDay}>{WEEKDAYS[i]}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.totalWrap}>
            <Text
              style={[styles.total, { color: accent }]}
              accessibilityLabel={`Week total, ${total} TEI`}
              adjustsFontSizeToFit
              numberOfLines={1}
            >
              {total}
            </Text>
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.88)']}
              locations={[0.25, 0.62, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          </View>
        </>
      )}

      <View style={{ flex: 1 }} />
      <View style={[styles.badge, { borderColor: accent }]}>
        <Text style={styles.badgeText}>RA</Text>
      </View>
    </View>
  );
}

/** "October 18, 2026" */
function weekLabel(d: Date): string {
  return `${d.toLocaleString('en-US', { month: 'long' })} ${d.getDate()}, ${d.getFullYear()}`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tei: { color: colors.text, fontSize: 58, fontWeight: '900', letterSpacing: -2 },
  weekOf: { color: colors.textMuted, fontSize: 15, textAlign: 'right', marginTop: -4 },
  chart: { flexDirection: 'row', marginTop: 22 },
  axis: { width: 26, height: CHART_HEIGHT },
  tick: { position: 'absolute', left: 0, color: '#A0A0A0', fontSize: 12 },
  bars: { flex: 1, flexDirection: 'row' },
  barCol: { flex: 1, alignItems: 'center' },
  barSlot: { height: CHART_HEIGHT, justifyContent: 'flex-end' },
  bar: { width: 14, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  barDay: { color: '#D0D0D0', fontSize: 13, marginTop: 6 },
  error: { color: '#FF6B6B', fontSize: 13, marginTop: 12 },
  totalWrap: { alignSelf: 'center', marginTop: 18 },
  total: {
    fontSize: 150,
    fontWeight: '800',
    letterSpacing: -6,
    lineHeight: 150,
    paddingRight: 6,
  },
  badge: {
    alignSelf: 'center',
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.text, fontSize: 24, fontWeight: '900', letterSpacing: -1 },
});
