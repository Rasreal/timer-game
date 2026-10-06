import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackArrow, OutlineButton } from '../src/components/Chrome';
import { useAuth } from '../src/auth';
import { listSessionsBetween } from '../src/lib/sessions';
import { listPlansBetween, planDayKey, type PlanRow } from '../src/lib/plans';
import type { SessionRow } from '../src/lib/database.types';
import {
  currentTimeframePeriods,
  gradePeriod,
  totalPlansInPeriod,
  totalSessionsInPeriod,
} from '../src/lib/review';
import { GRADE_COLORS } from '../src/lib/tei';
import { colors, useAccent } from '../src/theme';

/**
 * PREMIUM Screen 18 — current workload review by timeframe.
 *
 * The monthly screen is best for finding a particular workout. This screen
 * makes the current week through year comparable with the target planned for
 * the same period, using the workbook's five valuation colours.
 */
export default function ReviewTimeframe() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const accent = useAccent();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const periods = useMemo(() => currentTimeframePeriods(), []);

  useEffect(() => {
    if (profile && profile.tier !== 'premium') router.replace('/home');
  }, [profile, router]);

  const load = useCallback(async () => {
    const annual = periods.at(-1);
    if (!annual) return;
    setLoading(true);
    setError(null);
    const [sessionResult, planResult] = await Promise.all([
      listSessionsBetween(annual.start.toISOString(), annual.through.toISOString()),
      listPlansBetween(planDayKey(annual.start), planDayKey(annual.end)),
    ]);
    setSessions(sessionResult.data);
    setPlans(planResult.data);
    setError(sessionResult.error ?? planResult.error);
    setLoading(false);
  }, [periods]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 20) + 20 }}
    >
      <View style={styles.header}>
        <BackArrow onPress={() => router.canGoBack() ? router.back() : router.replace('/review')} />
        <Text style={styles.title}>TEI Review -{ '\n' }Effective Ranges per Timeframe</Text>
      </View>
      <Text style={[styles.subtitle, { color: accent }]}>Your current training load</Text>
      <Text style={styles.hint}>Each total includes saved sessions from the start of the current period through today.</Text>

      {loading ? (
        <ActivityIndicator color={accent} size="large" style={{ marginTop: 70 }} />
      ) : (
        periods.map((period) => {
          const actual = totalSessionsInPeriod(sessions, period.start, period.through);
          const planned = totalPlansInPeriod(plans, period.start, period.end);
          const grade = gradePeriod(actual, planned);
          return (
            <View key={period.label} style={styles.module}>
              <View style={styles.moduleHeader}>
                <View>
                  <Text style={styles.periodName}>{period.label}</Text>
                  <Text style={styles.periodDates}>{formatPeriod(period.start, period.end)}</Text>
                </View>
                <View style={[styles.scoreRing, { borderColor: GRADE_COLORS[grade] }]}>
                  <Text style={[styles.scoreValue, { color: GRADE_COLORS[grade] }]}>{Math.round(actual)}</Text>
                  <Text style={styles.scoreUnit}>TEI</Text>
                </View>
              </View>
              <View style={styles.rule} />
              <View style={styles.moduleFooter}>
                <Text style={styles.target}>Effective range {period.min}-{period.max}</Text>
                <Text style={styles.target}>{planned > 0 ? `Planned ${Math.round(planned)} TEI` : 'No TEI planned'}</Text>
              </View>
            </View>
          );
        })
      )}

      {error && <Text style={styles.error}>{error}</Text>}
      <OutlineButton title="Review Each Day" onPress={() => router.replace('/review')} style={styles.button} />
      <OutlineButton title="Plan Future TEI" onPress={() => router.push('/plan')} style={styles.button} />
    </ScrollView>
  );
}

function formatPeriod(start: Date, end: Date): string {
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1);
  const format = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${format(start)} - ${format(last)}, ${last.getFullYear()}`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center' },
  title: { color: colors.text, flex: 1, fontSize: 23, fontWeight: '800', lineHeight: 27, textAlign: 'center', paddingRight: 28 },
  subtitle: { fontSize: 18, fontWeight: '800', marginTop: 24, textAlign: 'center' },
  hint: { color: colors.textMuted, fontSize: 14, lineHeight: 19, marginTop: 7, textAlign: 'center' },
  module: { backgroundColor: colors.surface2, borderColor: '#353535', borderRadius: 14, borderWidth: 1, marginTop: 16, padding: 15 },
  moduleHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  periodName: { color: colors.text, fontSize: 20, fontWeight: '800' },
  periodDates: { color: colors.textMuted, fontSize: 14, marginTop: 3 },
  scoreRing: { alignItems: 'center', borderRadius: 34, borderWidth: 3, height: 68, justifyContent: 'center', width: 68 },
  scoreValue: { fontSize: 23, fontWeight: '800', letterSpacing: -0.5 },
  scoreUnit: { color: colors.text, fontSize: 10, fontWeight: '700', marginTop: -2 },
  rule: { backgroundColor: '#3A3A3A', height: 1, marginTop: 13 },
  moduleFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 },
  target: { color: '#BEBEBE', fontSize: 12, fontWeight: '600' },
  error: { color: '#FFD2D2', fontSize: 13, marginTop: 14 },
  button: { marginTop: 14 },
});
