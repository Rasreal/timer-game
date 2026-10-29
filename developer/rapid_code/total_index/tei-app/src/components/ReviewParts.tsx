import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SessionVariable } from '../lib/review';
import { colors } from '../theme';

/**
 * Building blocks shared by "TEI - 7 Days in Review" and the Multiple Entries
 * micro-screen (Ken's 22 Oct 2026 mock-ups): a row of variable columns and
 * the bevelled TEI disc at the end of each row.
 */

/** Grey of the review screens, matching the monthly calendar's bands. */
export const REVIEW_GREY = '#6E6E6E';

/** Column of big value over small caption; `X` when nothing was logged. */
export function VarRow({
  vars,
  dim = false,
}: {
  vars: SessionVariable[];
  dim?: boolean;
}) {
  return (
    <View style={styles.varRow}>
      {vars.map((v) => (
        <View key={v.label} style={styles.varCell}>
          <Text style={[styles.varValue, dim && styles.dim]}>
            {v.value === null || v.value === undefined ? 'X' : v.value}
          </Text>
          <Text
            style={[styles.varLabel, dim && styles.dim]}
            numberOfLines={1}
            // Breakdown rows have five columns; shrink rather than truncate.
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {v.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** The four blank columns of a day or session slot with nothing in it. */
export const BLANK_VARS: SessionVariable[] = [
  { label: 'Sets', value: null },
  { label: 'Seconds', value: null },
  { label: '% Exert', value: null },
  { label: 'Minutes', value: null },
];

/**
 * The bevelled disc: a graphite rim around a near-black well, with the value
 * over a small "TEI" caption. A Pressable when `onPress` is given.
 */
export function TeiDisc({
  size = 62,
  children,
  caption = 'TEI',
  onPress,
  label,
  dim = false,
}: {
  size?: number;
  children: ReactNode;
  caption?: string;
  onPress?: () => void;
  label: string;
  dim?: boolean;
}) {
  const inset = Math.round(size * 0.09);
  const content = (
    <>
      <View
        style={[styles.well, { top: inset, left: inset, right: inset, bottom: inset }]}
      />
      <View style={styles.discContent}>
        {children}
        {caption ? <Text style={styles.discCaption}>{caption}</Text> : null}
      </View>
    </>
  );
  const shape = [
    styles.disc,
    { width: size, height: size, borderRadius: size / 2 },
    dim && { opacity: 0.35 },
  ];

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={label} style={shape}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [shape, { opacity: pressed ? 0.8 : dim ? 0.35 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  varRow: { flexDirection: 'row', marginTop: 4 },
  varCell: { flex: 1, alignItems: 'center' },
  varValue: { color: colors.text, fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  varLabel: { color: '#D6D6D6', fontSize: 11, fontWeight: '600', marginTop: -1 },
  dim: { color: '#9A9A9A' },
  disc: {
    backgroundColor: '#3A3A3A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  well: { position: 'absolute', borderRadius: 999, backgroundColor: '#0A0A0A' },
  discContent: { alignItems: 'center' },
  discCaption: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginTop: -1,
  },
});
