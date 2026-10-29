import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackArrow, DarkButton, Ellipsis } from '../src/components/Chrome';
import { DaySessionsSheet } from '../src/components/DaySessionsSheet';
import {
  BLANK_VARS,
  REVIEW_GREY,
  TeiDisc,
  VarRow,
} from '../src/components/ReviewParts';
import { useAuth } from '../src/auth';
import { useStore } from '../src/store';
import { listSessionsBetween } from '../src/lib/sessions';
import {
  calculatorRoute,
  parseDayKey,
  reviewDayKey,
  sessionVariables,
  sessionsByDay,
  startOfWeek,
  sumTei,
  weekDates,
} from '../src/lib/review';
import type { SessionRow } from '../src/lib/database.types';
import { colors, useAccent } from '../src/theme';

/**
 * "TEI - 7 Days in Review" (Ken's 22 Oct 2026 mock-ups), reached by
 * double-tapping a day on the monthly Review calendar.
 *
 * One row per day of that Sunday-to-Saturday week: the session's variables
 * and its TEI, OFF for a past day with nothing logged, or — when the day has
 * more than one session — a green "Multiple Entries" box whose tap slides up
 * the day's sessions. Tapping a session's TEI opens it for correction.
 */
export default function ReviewWeek() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { loadSession } = useStore();
  const accent = useAccent();
  const params = useLocalSearchParams<{ start?: string }>();

  const start = useMemo(
    () => startOfWeek(parseDayKey(params.start) ?? new Date()),
    [params.start],
  );
  const days = useMemo(() => weekDates(start), [start]);

  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDay, setOpenDay] = useState<Date | null>(null);

  // Re-read on focus: returning from an edit must show the corrected values.
  useFocusEffect(
    useCallback(() => {
      // Review is a paid-tier feature, as on the monthly calendar.
      if (profile && profile.tier === 'elemental') {
        router.replace('/home');
        return;
      }
      let cancelled = false;
      const after = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
      setLoading(true);
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
    }, [profile, router, start]),
  );

  const byDay = useMemo(() => sessionsByDay(rows), [rows]);
  const total = sumTei(rows);
  const openSessions = openDay ? byDay.get(reviewDayKey(openDay)) ?? [] : [];

  function edit(session: SessionRow) {
    setOpenDay(null);
    loadSession(session);
    router.push(calculatorRoute(session.calculator) as never);
  }

  function openDetails(day: Date, sessions: SessionRow[]) {
    if (sessions.length === 1) edit(sessions[0]);
    else if (sessions.length > 1) setOpenDay(day);
  }

  return (
    <View style={{ flex: 1, backgroundColor: REVIEW_GREY }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 18,
          paddingBottom: Math.max(insets.bottom, 16) + 16,
        }}
      >
        <View style={styles.headerRow}>
          <BackArrow
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/review'))}
          />
          <Text style={styles.heading}>TEI - 7 Days in Review</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.headingRule} />

        <View style={styles.startRow}>
          <CalendarGlyph />
          <Text style={styles.startLabel}>Start Date:</Text>
          <Text style={styles.startValue}>{longDate(start)}</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.text} style={{ marginTop: 60 }} />
        ) : (
          <>
            {error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.dayList}>
              {days.map((day, i) => {
                const sessions = byDay.get(reviewDayKey(day)) ?? [];
                return (
                  <DayRow
                    key={reviewDayKey(day)}
                    index={i + 1}
                    date={day}
                    sessions={sessions}
                    onOpen={() => openDetails(day, sessions)}
                  />
                );
              })}
            </View>

            <View style={styles.footer}>
              <View style={{ flex: 1 }}>
                <Text style={styles.totalLabel}>This 7 DAY Total TEI</Text>
                <View style={styles.rule} />
                <DarkButton
                  title="Back to YOUR Hub"
                  onPress={() => router.replace('/home')}
                  style={styles.hubBtn}
                />
              </View>
              <TeiDisc size={104} label={`Seven day total, ${Math.round(total)} TEI`}>
                <Text style={[styles.totalValue, { color: rows.length ? colors.green : accent }]}>
                  {rows.length ? Math.round(total) : ''}
                </Text>
              </TeiDisc>
            </View>
          </>
        )}
      </ScrollView>

      <DaySessionsSheet
        date={openDay}
        sessions={openSessions}
        onClose={() => setOpenDay(null)}
        onEdit={edit}
        onHub={() => {
          setOpenDay(null);
          router.replace('/home');
        }}
      />
    </View>
  );
}

function DayRow({
  index,
  date,
  sessions,
  onOpen,
}: {
  index: number;
  date: Date;
  sessions: SessionRow[];
  onOpen: () => void;
}) {
  const dayTotal = Math.round(sumTei(sessions));
  const many = sessions.length > 1;
  const single = sessions.length === 1 ? sessions[0] : null;
  const future = isFuture(date);

  return (
    <View style={styles.dayRow}>
      <View style={{ flex: 1 }}>
        <View style={styles.dayTitleRow}>
          <Text style={styles.dayTitle} numberOfLines={1}>
            Day {index}:{' '}
            <Text style={styles.dayDate}>{dayLabel(date)}</Text>
          </Text>
          {sessions.length > 0 && (
            <Ellipsis
              onPress={onOpen}
              color="#D0D0D0"
              size={14}
              label={`Open Day ${index} sessions`}
            />
          )}
        </View>
        <View style={styles.rule} />

        {many ? (
          <Pressable
            onPress={onOpen}
            accessibilityRole="button"
            accessibilityLabel={`Day ${index}, ${sessions.length} sessions. Tap to see sessions.`}
            style={({ pressed }) => [styles.multi, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={styles.multiTitle}>Multiple Entries →</Text>
            <Text style={styles.multiHint}>TAP to See Sessions</Text>
          </Pressable>
        ) : (
          <VarRow vars={single ? sessionVariables(single) : BLANK_VARS} dim={!single} />
        )}
      </View>

      {sessions.length > 0 ? (
        <TeiDisc
          onPress={onOpen}
          label={
            many
              ? `Day ${index}, ${dayTotal} TEI from ${sessions.length} sessions. See sessions.`
              : `Day ${index}, ${dayTotal} TEI. Edit this session.`
          }
        >
          <Text style={styles.dayTei}>{dayTotal}</Text>
        </TeiDisc>
      ) : (
        <TeiDisc label={`Day ${index}, ${future ? 'not yet' : 'rest day'}`}>
          <Text style={future ? styles.dayEmpty : styles.dayOff}>{future ? '•••' : 'OFF'}</Text>
        </TeiDisc>
      )}
    </View>
  );
}

/** A calendar mark drawn from Views, as on the 7 Day Planner. */
function CalendarGlyph() {
  return (
    <View style={styles.calBody}>
      {[0, 1, 2].map((row) => (
        <View key={row} style={styles.calDotRow}>
          {[0, 1, 2].map((col) => (
            <View key={col} style={styles.calDot} />
          ))}
        </View>
      ))}
    </View>
  );
}

function isFuture(d: Date): boolean {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return d.getTime() > endOfToday.getTime();
}

/** "MONDAY - May 4, 2026" */
function dayLabel(d: Date): string {
  const weekday = d.toLocaleString('en-US', { weekday: 'long' }).toUpperCase();
  return `${weekday} - ${longDate(d)}`;
}

/** "May 4, 2026" */
function longDate(d: Date): string {
  return `${d.toLocaleString('en-US', { month: 'long' })} ${d.getDate()}, ${d.getFullYear()}`;
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  heading: {
    flex: 1,
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  headingRule: { height: 1, backgroundColor: '#9A9A9A', marginTop: 4, marginHorizontal: 30 },
  startRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  startLabel: { color: '#B5B5B5', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  startValue: { flex: 1, color: colors.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  error: { color: '#FFD2D2', fontSize: 13, marginTop: 14 },
  dayList: { marginTop: 18, gap: 14 },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dayTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayTitle: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '800' },
  dayDate: { color: '#DADADA', fontWeight: '600' },
  rule: { height: 1, backgroundColor: '#9A9A9A', marginTop: 3 },
  multi: {
    marginTop: 6,
    backgroundColor: '#5E9E3B',
    borderRadius: 4,
    paddingVertical: 5,
    alignItems: 'center',
  },
  multiTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  multiHint: { color: '#E6F5DA', fontSize: 11, fontStyle: 'italic' },
  dayTei: { color: colors.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  dayOff: { color: '#BDBDBD', fontSize: 17, fontWeight: '800' },
  dayEmpty: { color: colors.text, fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  footer: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 24 },
  totalLabel: { color: colors.text, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  hubBtn: { marginTop: 12, paddingVertical: 11, backgroundColor: '#151515' },
  totalValue: { fontSize: 38, fontWeight: '800', letterSpacing: -1 },
  calBody: {
    width: 30,
    height: 26,
    borderRadius: 4,
    borderWidth: 3,
    borderColor: '#B5B5B5',
    padding: 3,
    justifyContent: 'space-between',
  },
  calDotRow: { flexDirection: 'row', justifyContent: 'space-between' },
  calDot: { width: 4, height: 3, backgroundColor: '#B5B5B5' },
});
