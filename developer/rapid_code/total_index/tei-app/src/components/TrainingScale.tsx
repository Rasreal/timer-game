import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CONTROLLABLE_OUTCOMES,
  EFFECT_GRADIENT,
  REASON_GRADIENT,
  TRAINING_EFFECTS,
  TRAINING_REASONS,
  TRAINING_SCALE,
  WEEK_MONTH,
  type TrainingBand,
} from '../lib/training';

const ROWS = TRAINING_SCALE.to - TRAINING_SCALE.from + 1;
const TEXT = '#333333';
const BREAKING_POINT_TEXT = '#7030A0';
const DOTS = '#3DCEF2';

/**
 * Flex ratio for a column fraction. Yoga, like CSS, hands out only part of
 * the free space when a row's flex-grow values add up to less than 1, so the
 * fractions are scaled to whole numbers.
 */
function share(fraction: number): number {
  return Math.round(fraction * 1000);
}

/**
 * Column widths as fractions of the chart, measured off Ken's two 30 Oct 2026
 * graphics: Per Session has one TEI column, Week & Month three. The Session
 * column is a little wider than drawn so its heading fits on one line.
 */
const COLUMNS = {
  session: { reason: 0.414, effect: 0.423, numbers: [0.163] },
  detailed: { reason: 0.317, effect: 0.287, numbers: [0.11, 0.15, 0.136] },
} as const;

/**
 * "Understanding YOUR Training" (Ken's 19, 22 and 30 Oct 2026 edits): the
 * reason for training, the effect it produces and the TEI scale 2–33, drawn
 * from Views so it stays sharp at any size and needs no image asset. One
 * rainbow runs behind the effects and the numbers, as in his graphic.
 *
 * `detailed` adds the Week and Month columns with the "Controllable
 * Outcomes" box. Every reason and effect carries an information icon that
 * calls `onInfo`.
 */
export function TrainingScale({
  detailed = false,
  step = 20,
  onInfo,
}: {
  detailed?: boolean;
  /** Height of one TEI row. */
  step?: number;
  onInfo?: (band: TrainingBand) => void;
}) {
  const [width, setWidth] = useState(0);
  const cols = detailed ? COLUMNS.detailed : COLUMNS.session;
  const numbers = Array.from({ length: ROWS }, (_, i) => TRAINING_SCALE.from + i);
  const rowsHeight = ROWS * step;
  const numberFont = Math.round(step * (detailed ? 0.72 : 0.8));
  const labelFont = detailed ? 13 : 16;

  // Left edge of the TEI columns, for the Controllable Outcomes overlay.
  const numbersLeft = (cols.reason + cols.effect) * width;
  const boxTop = (CONTROLLABLE_OUTCOMES.from - TRAINING_SCALE.from) * step;
  const boxHeight = (CONTROLLABLE_OUTCOMES.to - CONTROLLABLE_OUTCOMES.from + 1) * step;

  return (
    <View testID="training-chart" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {/* Column headings */}
      <View style={styles.headRow}>
        <Text style={[styles.head, { flex: share(cols.reason) }]}>
          {detailed ? 'Reason for\nTraining' : 'Reason for Training'}
        </Text>
        <Text style={[styles.head, { flex: share(cols.effect) }]}>
          {detailed ? 'Resulting\nEffect' : 'Resulting Effect'}
        </Text>
        {detailed ? (
          <View style={[styles.indexHead, { flex: share(cols.numbers.reduce((a, b) => a + b, 0)) }]}>
            <Text style={styles.indexTitle} numberOfLines={1} adjustsFontSizeToFit>
              TOTAL EFFECT INDEX
            </Text>
            <View style={{ flexDirection: 'row' }}>
              {['Session', 'Week', 'Month'].map((h, i) => (
                <Text
                  key={h}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={[styles.subHead, { flex: share(cols.numbers[i]) }]}
                >
                  {h}
                </Text>
              ))}
            </View>
          </View>
        ) : (
          <Text style={[styles.head, { flex: share(cols.numbers[0]) }]}>TEI</Text>
        )}
      </View>

      <View style={[styles.chart, { height: rowsHeight }]}>
        {/* Reason for training */}
        <View style={{ flex: share(cols.reason) }}>
          <LinearGradient
            colors={gradientColours(REASON_GRADIENT, true)}
            locations={gradientStops(REASON_GRADIENT, true)}
            style={StyleSheet.absoluteFill}
          />
          {TRAINING_REASONS.map((band) => (
            <View key={band.label} style={[styles.band, { height: bandRows(band) * step }]}>
              <InfoLabel
                band={band}
                stacked
                fontSize={detailed ? 15 : 18}
                color={band.label === 'BREAKING POINT' ? BREAKING_POINT_TEXT : TEXT}
                onInfo={onInfo}
              />
            </View>
          ))}
        </View>

        {/* Effects and numbers share one rainbow */}
        <View style={{ flex: share(1 - cols.reason), flexDirection: 'row' }}>
          <LinearGradient
            colors={gradientColours(EFFECT_GRADIENT, false)}
            locations={gradientStops(EFFECT_GRADIENT, false)}
            style={StyleSheet.absoluteFill}
          />
          <View style={{ flex: share(cols.effect) }}>
            {TRAINING_EFFECTS.map((band, i) => (
              <View
                key={band.label}
                style={[
                  styles.band,
                  { height: bandRows(band) * step, alignItems: detailed ? 'flex-start' : 'center' },
                  detailed && { paddingLeft: 8 },
                  // Room above "Conditioning" for the Controllable Outcomes label.
                  detailed && band.label === 'Conditioning' && { paddingTop: step * 1.4 },
                  i > 0 && styles.rule,
                ]}
              >
                <InfoLabel
                  band={band}
                  fontSize={labelFont}
                  color={TEXT}
                  narrow={detailed}
                  onInfo={onInfo}
                />
              </View>
            ))}
          </View>

          {/* Session TEI; in detailed mode the effect rules carry on through it */}
          <View style={{ flex: share(cols.numbers[0]) }}>
            {detailed
              ? TRAINING_EFFECTS.map((band, i) => (
                  <View
                    key={band.label}
                    style={[{ height: bandRows(band) * step }, i > 0 && styles.rule]}
                  >
                    {numbers
                      .filter((n) => n >= band.from && n <= band.to)
                      .map((n) => (
                        <NumberCell key={n} value={n} step={step} size={numberFont} bold />
                      ))}
                  </View>
                ))
              : numbers.map((n) => (
                  <NumberCell key={n} value={n} step={step} size={numberFont} bold />
                ))}
          </View>

          {detailed && (
            <>
              <View style={{ flex: share(COLUMNS.detailed.numbers[1]) }}>
                {numbers.map((n) => (
                  <NumberCell key={n} value={WEEK_MONTH[n].week} step={step} size={numberFont - 1} />
                ))}
              </View>
              <View style={{ flex: share(COLUMNS.detailed.numbers[2]) }}>
                {numbers.map((n) => (
                  <NumberCell key={n} value={WEEK_MONTH[n].month} step={step} size={numberFont - 1} />
                ))}
              </View>
            </>
          )}
        </View>

        {detailed && width > 0 && (
          <>
            {/* The weekly and monthly Effective Ranges, boxed as in the graphic */}
            <View
              pointerEvents="none"
              accessible
              accessibilityLabel={`Controllable Outcomes: TEI ${CONTROLLABLE_OUTCOMES.from} to ${CONTROLLABLE_OUTCOMES.to} per session`}
              style={[
                styles.box,
                { left: numbersLeft, top: boxTop, height: boxHeight, width: width - numbersLeft - 1 },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.outcomes,
                {
                  left: cols.reason * width,
                  width: cols.effect * width,
                  top: (13 - TRAINING_SCALE.from) * step + step * 0.05,
                },
              ]}
            >
              <Text style={styles.outcomesText}>Controllable{'\n'}Outcomes</Text>
            </View>
            <DottedLine
              left={(cols.reason + cols.effect * 0.72) * width}
              width={numbersLeft - (cols.reason + cols.effect * 0.72) * width}
              top={(14 - TRAINING_SCALE.from) * step - 1}
            />
          </>
        )}
      </View>
    </View>
  );
}

/** A label with its information icon; the pair is one button. */
function InfoLabel({
  band,
  fontSize,
  color,
  stacked = false,
  narrow = false,
  onInfo,
}: {
  band: TrainingBand;
  fontSize: number;
  color: string;
  /** Two-word reason labels break onto two lines, icon underneath. */
  stacked?: boolean;
  /** The Week & Month layout breaks "Therapy/Health" after the slash. */
  narrow?: boolean;
  onInfo?: (band: TrainingBand) => void;
}) {
  const text = stacked
    ? band.label.replace(' ', '\n')
    : narrow
      ? band.label.replace('/', '/\n')
      : band.label;
  return (
    <Pressable
      onPress={() => onInfo?.(band)}
      disabled={!onInfo}
      accessibilityRole="button"
      accessibilityLabel={`${band.label}, TEI ${band.from} to ${band.to}`}
      accessibilityHint="Shows what this means"
      hitSlop={6}
      style={({ pressed }) => [
        stacked ? styles.labelStacked : styles.labelInline,
        { opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Text style={[styles.label, { fontSize, lineHeight: fontSize * 1.15, color }]}>{text}</Text>
      {onInfo && <InfoIcon color={color} />}
    </Pressable>
  );
}

function InfoIcon({ color }: { color: string }) {
  return (
    <View style={[styles.infoIcon, { borderColor: color }]}>
      <Text style={[styles.infoI, { color }]}>i</Text>
    </View>
  );
}

function NumberCell({
  value,
  step,
  size,
  bold = false,
}: {
  value: number;
  step: number;
  size: number;
  bold?: boolean;
}) {
  return (
    <Text
      style={[
        styles.num,
        { height: step, lineHeight: step, fontSize: size, fontWeight: bold ? '800' : '500' },
      ]}
    >
      {value}
    </Text>
  );
}

/** iOS can't dot a single border side, so the connector is drawn as dots. */
function DottedLine({ left, width, top }: { left: number; width: number; top: number }) {
  const count = Math.max(0, Math.floor(width / 4));
  return (
    <View pointerEvents="none" style={[styles.dotRow, { left, top, width }]}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.dot} />
      ))}
    </View>
  );
}

function bandRows(band: TrainingBand): number {
  return band.to - band.from + 1;
}

/**
 * Gradient stops at the middle of each TEI row, after a first stop for the
 * white fade at the top. The reason column also changes abruptly at
 * ATHLETIC PERFORMANCE and BREAKING POINT, as in the graphic.
 */
function gradientStops(colours: string[], hardEdges: boolean): [number, number, ...number[]] {
  const stops = [0, ...colours.slice(1).map((_, i) => (i + 0.5) / ROWS)];
  if (!hardEdges) return stops as [number, number, ...number[]];
  const edges = hardEdgeRows();
  const out: number[] = [];
  stops.forEach((s, i) => {
    const row = i - 1;
    if (edges.includes(row)) out.push(row / ROWS, row / ROWS);
    out.push(s);
  });
  return out as [number, number, ...number[]];
}

function gradientColours(colours: string[], hardEdges: boolean): [string, string, ...string[]] {
  if (!hardEdges) return colours as [string, string, ...string[]];
  const edges = hardEdgeRows();
  const out: string[] = [];
  colours.forEach((c, i) => {
    const row = i - 1;
    if (edges.includes(row)) out.push(colours[i - 1], c);
    out.push(c);
  });
  return out as [string, string, ...string[]];
}

/** Rows (0 = TEI 2) where a new reason band starts with a visible edge. */
function hardEdgeRows(): number[] {
  return TRAINING_REASONS.slice(2).map((b) => b.from - TRAINING_SCALE.from);
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 6 },
  head: { color: TEXT, fontSize: 15, fontWeight: '500', textAlign: 'center' },
  indexHead: { borderLeftWidth: 1, borderLeftColor: '#9A9A9A', paddingLeft: 2 },
  indexTitle: { color: '#111111', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  subHead: { color: TEXT, fontSize: 13, textAlign: 'center' },
  chart: { flexDirection: 'row' },
  band: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  rule: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.3)' },
  labelStacked: { alignItems: 'center', gap: 4 },
  labelInline: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  label: { textAlign: 'center', fontWeight: '500' },
  infoIcon: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.75,
  },
  infoI: { fontSize: 10, fontWeight: '800', lineHeight: 12, fontStyle: 'italic' },
  num: { color: '#111111', textAlign: 'center' },
  box: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dotted',
    borderColor: DOTS,
  },
  outcomes: { position: 'absolute', alignItems: 'center' },
  outcomesText: {
    color: '#7C884A',
    fontSize: 13,
    fontWeight: '700',
    fontStyle: 'italic',
    letterSpacing: 1.2,
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  dotRow: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 2,
  },
  dot: { width: 2, height: 2, borderRadius: 1, backgroundColor: DOTS },
});
