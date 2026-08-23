import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../theme';
import { Ellipsis } from './Chrome';

/**
 * Premium variable ring with a progress arc (deck: PREMIUM Screens 3-7).
 *
 * The arc shows how far the entered value sits through its recommended range,
 * and turns red once the value passes `overAt` — the "red gradient glows down
 * from the top" the workbook README describes.
 *
 * Drawn with the classic two-half-circle technique rather than SVG, to avoid
 * pulling in react-native-svg for one component: each half of the ring is a
 * rotated circle whose far side is transparent, clipped to its own side so the
 * rotation cannot bleed across the middle.
 */
export function ProgressRing({
  value,
  label,
  onChange,
  onEllipsis,
  min,
  max,
  overAt,
  underAt,
  size = 132,
}: {
  value: number | null;
  label: string;
  onChange?: (v: number | null) => void;
  onEllipsis?: () => void;
  min: number;
  max: number;
  /** Values above this tint the arc red. */
  overAt?: number;
  /**
   * Values below this tint the arc red too — for a variable whose valid band
   * has a floor as well as a ceiling (a rest that is dangerously short, an
   * exertion below the 50% the scale starts at).
   */
  underAt?: number;
  size?: number;
}) {
  const span = max - min;
  const pct =
    value === null || span <= 0
      ? 0
      : Math.max(0, Math.min(1, (value - min) / span));
  const over =
    value !== null &&
    ((overAt !== undefined && value > overAt) ||
      (underAt !== undefined && value < underAt));
  const arcColor = over ? colors.red : colors.orange;

  const ring = Math.max(6, Math.round(size * 0.085));
  const numberSize = Math.round(size * 0.34);
  const half = size / 2;

  // 0..0.5 sweeps the right half from 12 o'clock; 0.5..1 carries on round the
  // left half. Each half rotates from -180deg (hidden) to 0deg (fully shown).
  const rightDeg = -180 + Math.min(pct, 0.5) * 2 * 180;
  const leftDeg = -180 + Math.max(0, pct - 0.5) * 2 * 180;

  const halfArc = (side: 'left' | 'right', deg: number) => (
    <View
      style={[
        styles.halfClip,
        side === 'right' ? { left: half, width: half } : { left: 0, width: half },
      ]}
      pointerEvents="none"
    >
      <View
        style={{
          width: size,
          height: size,
          marginLeft: side === 'right' ? -half : 0,
          borderRadius: half,
          borderWidth: ring,
          // Only the half facing this clip is painted; the other half is
          // transparent so the rotation reveals a sweep rather than a disc.
          borderTopColor: arcColor,
          borderRightColor: side === 'right' ? arcColor : 'transparent',
          borderBottomColor: side === 'right' ? 'transparent' : arcColor,
          borderLeftColor: side === 'right' ? 'transparent' : arcColor,
          transform: [{ rotate: `${deg}deg` }],
        }}
      />
    </View>
  );

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size }}>
        <View
          style={{
            width: size,
            height: size,
            borderRadius: half,
            borderWidth: ring,
            borderColor: '#2E2E2E',
          }}
        />

        {/* An under-range value clamps pct to 0, which would draw no arc at
            all and hide the red warning — so an out-of-range value always
            paints at least the first segment. */}
        {(pct > 0 || over) && halfArc('right', rightDeg)}
        {pct > 0.5 && halfArc('left', leftDeg)}

        <View style={styles.center} pointerEvents="box-none">
          {onChange ? (
            <TextInput
              value={value === null ? '' : String(value)}
              onChangeText={(raw) => {
                const digits = raw.replace(/[^0-9]/g, '');
                onChange(digits === '' ? null : Number(digits));
              }}
              keyboardType="number-pad"
              placeholder="- -"
              placeholderTextColor="#5A5A5A"
              accessibilityLabel={label}
              selectionColor={colors.orange}
              style={[styles.number, { fontSize: numberSize, width: size * 0.66 }]}
            />
          ) : (
            <Text style={[styles.number, { fontSize: numberSize }]}>
              {value === null ? '- -' : String(value)}
            </Text>
          )}
          <Text style={styles.label}>{label}</Text>
        </View>
      </View>

      {onEllipsis && (
        <View style={{ marginTop: 2 }}>
          <Ellipsis onPress={onEllipsis} label={`More about ${label}`} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  halfClip: { position: 'absolute', top: 0, bottom: 0, overflow: 'hidden' },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    color: colors.text,
    fontWeight: '700',
    letterSpacing: -1.5,
    textAlign: 'center',
    padding: 0,
  },
  label: { color: '#D8D8D8', fontSize: 14, marginTop: -2 },
});
