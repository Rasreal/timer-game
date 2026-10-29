import { StyleSheet, Text, View } from 'react-native';
import {
  TRAINING_EFFECTS,
  TRAINING_REASONS,
  TRAINING_SCALE,
  type TrainingBand,
} from '../lib/training';

/** Height of one TEI step; the whole chart is 32 steps tall. */
const STEP = 15;

/**
 * "Understanding YOUR Training" (Ken's 19/22 Oct 2026 edits): three columns —
 * the reason for training, the effect it produces, and the TEI scale 2–33 —
 * drawn from Views so it stays sharp at any size and needs no image asset.
 */
export function TrainingScale() {
  const steps = TRAINING_SCALE.to - TRAINING_SCALE.from + 1;
  const numbers = Array.from({ length: steps }, (_, i) => TRAINING_SCALE.from + i);

  return (
    <View>
      <Text style={styles.title}>Understanding YOUR Training</Text>
      <View style={styles.headRow}>
        <Text style={[styles.head, styles.reasonCol]}>Reason for Training</Text>
        <Text style={[styles.head, styles.effectCol]}>Resulting Effect</Text>
        <Text style={[styles.head, styles.teiCol]}>TEI</Text>
      </View>

      <View style={styles.chart}>
        <View style={styles.reasonCol}>
          {TRAINING_REASONS.map((band) => (
            <Band key={band.label} band={band} textColor={band.label === 'DEATHWISH' ? '#8E5BC4' : '#1C1C1C'} bold />
          ))}
        </View>
        <View style={styles.effectCol}>
          {TRAINING_EFFECTS.map((band) => (
            <Band
              key={band.label}
              band={band}
              textColor={band.label === 'Excessive' || band.label === 'Extreme' ? '#3A0A0A' : '#1C1C1C'}
            />
          ))}
        </View>
        <View style={styles.teiCol}>
          {numbers.map((n) => (
            <Text key={n} style={[styles.num, { color: numberColor(n) }]}>
              {n}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

function Band({
  band,
  textColor,
  bold = false,
}: {
  band: TrainingBand;
  textColor: string;
  bold?: boolean;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${band.label}, TEI ${band.from} to ${band.to}`}
      style={[
        styles.band,
        { height: (band.to - band.from + 1) * STEP, backgroundColor: band.color },
      ]}
    >
      <Text style={[styles.bandText, { color: textColor }, bold && styles.bandBold]}>
        {band.label}
      </Text>
    </View>
  );
}

function numberColor(n: number): string {
  if (n > 26) return '#B48BE0';
  if (n > 22) return '#FF5A55';
  return '#E8E8E8';
}

const styles = StyleSheet.create({
  title: { color: '#D0D0D0', fontSize: 21, fontWeight: '800', letterSpacing: -0.3 },
  headRow: { flexDirection: 'row', marginTop: 10, marginBottom: 4 },
  head: { color: '#BDBDBD', fontSize: 12, fontWeight: '600' },
  chart: { flexDirection: 'row' },
  reasonCol: { flex: 1.15 },
  effectCol: { flex: 1.15 },
  teiCol: { width: 30, alignItems: 'flex-end' },
  band: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  bandText: { fontSize: 12, textAlign: 'center' },
  bandBold: { fontSize: 13, fontWeight: '700' },
  num: { height: STEP, fontSize: 11, lineHeight: STEP, fontWeight: '700' },
});
