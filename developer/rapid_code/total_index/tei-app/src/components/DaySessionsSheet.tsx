import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SessionRow } from '../lib/database.types';
import { sessionVariables, sumTei } from '../lib/review';
import { DarkButton } from './Chrome';
import { BLANK_VARS, TeiDisc, VarRow } from './ReviewParts';
import { colors, useAccent } from '../theme';

/** The mock-up always shows five slots; a busier day simply adds more. */
const MIN_SLOTS = 5;

/**
 * "Multiple Entries" micro-screen (Ken's 22 Oct 2026 mock-up): slides up over
 * 7 Days in Review — or the monthly calendar — listing every session logged on
 * one day with its time, variables and TEI, then that day's total. Tapping a
 * session opens it in its calculator for correction.
 */
export function DaySessionsSheet({
  date,
  sessions,
  onClose,
  onEdit,
  onHub,
}: {
  /** The day shown; null hides the sheet. */
  date: Date | null;
  sessions: SessionRow[];
  onClose: () => void;
  onEdit: (session: SessionRow) => void;
  onHub: () => void;
}) {
  const insets = useSafeAreaInsets();
  const accent = useAccent();
  const slots = Math.max(MIN_SLOTS, sessions.length);
  const total = sumTei(sessions);

  return (
    <Modal
      visible={date !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.scrim}>
        <View style={[styles.card, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close sessions"
            hitSlop={14}
            style={styles.close}
          >
            <Text style={[styles.closeText, { color: accent }]}>✕</Text>
          </Pressable>

          <Text style={styles.count}>
            {sessions.length} {sessions.length === 1 ? 'Session' : 'Sessions'}
          </Text>
          <Text style={[styles.date, { color: accent }]}>{date ? dayTitle(date) : ''}</Text>

          <ScrollView style={{ marginTop: 14 }} contentContainerStyle={{ gap: 14 }}>
            {Array.from({ length: slots }, (_, i) => {
              const session = sessions[i];
              return (
                <View key={session?.id ?? `empty-${i}`} style={styles.slot}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.slotTitle, !session && styles.dim]}>
                      Session {i + 1}:{'  '}
                      <Text style={styles.slotTime}>
                        {session ? timeOf(session.performed_at) : '-----'}
                      </Text>
                    </Text>
                    <View style={[styles.rule, !session && { opacity: 0.4 }]} />
                    <VarRow vars={session ? sessionVariables(session) : BLANK_VARS} dim={!session} />
                  </View>
                  {session ? (
                    <TeiDisc
                      onPress={() => onEdit(session)}
                      label={`Session ${i + 1}, ${Math.round(session.tei)} TEI. Edit this session.`}
                    >
                      <Text style={styles.discValue}>{Math.round(session.tei)}</Text>
                    </TeiDisc>
                  ) : (
                    <TeiDisc dim label={`Session ${i + 1}, empty`}>
                      <Text style={styles.discEmpty}>•••</Text>
                    </TeiDisc>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <View style={{ flex: 1 }}>
              <Text style={styles.totalLabel}>This Day&rsquo;s Total TEI</Text>
              <View style={styles.rule} />
              <DarkButton title="Back to YOUR Hub" onPress={onHub} style={styles.hubBtn} />
            </View>
            <TeiDisc size={92} label={`This day's total, ${Math.round(total)} TEI`}>
              <Text style={styles.totalValue}>{Math.round(total)}</Text>
            </TeiDisc>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** "Monday - May 4, 2026" */
export function dayTitle(d: Date): string {
  const weekday = d.toLocaleString('en-US', { weekday: 'long' });
  const month = d.toLocaleString('en-US', { month: 'long' });
  return `${weekday} - ${month} ${d.getDate()}, ${d.getFullYear()}`;
}

function timeOf(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    .toLowerCase();
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  card: {
    maxHeight: '88%',
    backgroundColor: '#2E2E2E',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  close: { position: 'absolute', top: 14, right: 18, zIndex: 1 },
  closeText: { fontSize: 24, fontWeight: '300' },
  count: {
    color: colors.text,
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -1,
    textAlign: 'center',
  },
  date: { fontSize: 19, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  slotTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  slotTime: { fontWeight: '600' },
  dim: { color: '#8A8A8A' },
  rule: { height: 1, backgroundColor: '#8A8A8A', marginTop: 3 },
  discValue: { color: colors.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  discEmpty: { color: colors.text, fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  footer: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 18 },
  totalLabel: { color: colors.text, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  hubBtn: { marginTop: 12, paddingVertical: 11, backgroundColor: '#151515' },
  totalValue: { color: colors.green, fontSize: 34, fontWeight: '800', letterSpacing: -1 },
});
