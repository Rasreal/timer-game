import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  TRAINING_EFFECTS,
  TRAINING_REASONS,
  TRAINING_SCALE,
  type TrainingBand,
} from '../lib/training';

/** Height of one TEI step; the whole chart is 32 steps tall. */
const STEP = 15;
const STEPS = TRAINING_SCALE.to - TRAINING_SCALE.from + 1;

/**
 * "Understanding YOUR Training" (Ken's 19/22 Oct 2026 edits): three columns —
 * the reason for training, the effect it produces, and the TEI scale 2–33 —
 * drawn from Views so it stays sharp at any size and needs no image asset.
 * As in his graphic, one continuous rainbow runs behind the effect column and
 * the numbers, with a rule between effects.
 */
export function TrainingScale() {
  const numbers = Array.from({ length: STEPS }, (_, i) => TRAINING_SCALE.from + i);

  // One colour stop at the middle of each effect band.
  const stops = TRAINING_EFFECTS.map((band) => band.color);
  const locations = TRAINING_EFFECTS.map(
    (band) => ((band.from + band.to) / 2 - TRAINING_SCALE.from + 0.5) / STEPS,
  );

  return (
    <View>
      <Text style={styles.title}>Understanding YOUR Training</Text>
      <View style={styles.headRow}>
        <Text style={[styles.head, styles.reasonCol]}>Reason for Training</Text>
        <View style={styles.rainbow}>
          <Text style={[styles.head, styles.effectCol, { textAlign: 'center' }]}>
            Resulting Effect
          </Text>
          <Text style={[styles.head, styles.teiCol]}>TEI</Text>
        </View>
      </View>

      <View style={styles.chart}>
        <View style={styles.reasonCol}>
          {TRAINING_REASONS.map((band) => (
            <Band
              key={band.label}
              band={band}
              color={band.color}
              textColor={band.label === 'DEATHWISH' ? '#8E5BC4' : '#1C1C1C'}
              bold
            />
          ))}
        </View>

        <View style={styles.rainbow}>
          <LinearGradient
            colors={stops as unknown as [string, string, ...string[]]}
            locations={locations as unknown as [number, number, ...number[]]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.effectCol}>
            {TRAINING_EFFECTS.map((band, i) => (
              <Band
                key={band.label}
                band={band}
                textColor="#1C1C1C"
                rule={i > 0}
              />
            ))}
          </View>
          <View style={styles.teiCol}>
            {numbers.map((n) => (
              <Text key={n} style={styles.num}>
                {n}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function Band({
  band,
  color,
  textColor,
  bold = false,
  rule = false,
}: {
  band: TrainingBand;
  /** Flat fill; omitted where the rainbow behind shows through. */
  color?: string;
  textColor: string;
  bold?: boolean;
  /** A thin rule above the band, as between the effects. */
  rule?: boolean;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${band.label}, TEI ${band.from} to ${band.to}`}
      style={[
        styles.band,
        { height: (band.to - band.from + 1) * STEP },
        color ? { backgroundColor: color } : null,
        rule && styles.rule,
      ]}
    >
      <Text style={[styles.bandText, { color: textColor }, bold && styles.bandBold]}>
        {band.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: '#D0D0D0', fontSize: 21, fontWeight: '800', letterSpacing: -0.3 },
  headRow: { flexDirection: 'row', marginTop: 10, marginBottom: 4 },
  head: { color: '#BDBDBD', fontSize: 12, fontWeight: '600' },
  chart: { flexDirection: 'row' },
  reasonCol: { flex: 1 },
  rainbow: { flex: 1.3, flexDirection: 'row' },
  effectCol: { flex: 1 },
  teiCol: { width: 30, alignItems: 'flex-end', paddingRight: 4 },
  band: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  rule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.35)' },
  bandText: { fontSize: 12, textAlign: 'center' },
  bandBold: { fontSize: 13, fontWeight: '700' },
  num: { height: STEP, fontSize: 11, lineHeight: STEP, fontWeight: '700', color: '#2A2A2A' },
});
