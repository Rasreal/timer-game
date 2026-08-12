import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackArrow, Divider, OutlineButton } from '../src/components/Chrome';
import { EFFECTIVE_RANGES } from '../src/lib/tei';
import { colors } from '../src/theme';

/** ELEMENTAL Screen 7 — Effective TEI Ranges. */
export default function Ranges() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<string | null>(null);

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
        <BackArrow onPress={() => router.back()} />
        <Text style={styles.title}>TEI - Effective Ranges</Text>
      </View>

      <Divider style={{ marginHorizontal: 44, marginTop: 8, marginBottom: 12 }} />

      <Text style={styles.recommended}>Recommended{'\n'}Target TEI Values</Text>
      <Text style={styles.selectRange}>Select a Target Range</Text>

      <Text style={styles.body}>
        These numbers show the Minimum and Maximum TEI points to score in a given
        Timeframe. Scoring below the Minimum may not provide desired results,
        while exceeding the Maximum could lead to over-training and injury.
      </Text>

      <Text style={styles.note}>
        Make a note of the Timeframe Numbers you want to track for results:
      </Text>

      {EFFECTIVE_RANGES.map((r) => (
        <RangeRow
          key={r.label}
          label={r.label}
          min={r.min}
          max={r.max}
          selected={selected === r.label}
          onSelect={() => setSelected(selected === r.label ? null : r.label)}
        />
      ))}

      <OutlineButton
        title="TEI Calculator →"
        onPress={() => router.replace('/calculator')}
        fontSize={20}
        style={{ alignSelf: 'flex-start', minWidth: 220, marginTop: 12 }}
      />
    </ScrollView>
  );
}

function RangeRow({
  label,
  min,
  max,
  selected,
  onSelect,
}: {
  label: string;
  min: number;
  max: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={styles.rangeRow}
    >
      <View style={{ flex: 1 }}>
        {/* The timeframe label sits on the Minimum row, right-aligned, as drawn. */}
        <View style={styles.rangeLabelRow}>
          <Text style={styles.minMax}>Minimum</Text>
          <Text
            style={[
              styles.timeframe,
              { color: selected ? colors.orange : '#A8A8A8' },
            ]}
          >
            {label}
          </Text>
        </View>
        <Divider style={{ marginVertical: 3 }} />
        <Text style={styles.minMax}>Maximum</Text>
      </View>

      <View
        style={[
          styles.circle,
          { borderColor: selected ? colors.orange : '#2E2E2E' },
        ]}
      >
        <Text style={styles.circleNum}>{min}</Text>
        <View style={styles.circleRule} />
        <Text style={styles.circleNum}>{max}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
    paddingRight: 24,
  },
  recommended: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 28,
  },
  selectRange: {
    color: '#C8C8C8',
    fontSize: 25,
    fontStyle: 'italic',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  body: { color: '#F0F0F0', fontSize: 15.5, lineHeight: 21, marginBottom: 16 },
  note: {
    color: colors.orange,
    fontSize: 19,
    lineHeight: 24,
    marginBottom: 20,
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  rangeLabelRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  minMax: { color: colors.text, fontSize: 15, fontWeight: '700' },
  timeframe: { fontSize: 20, fontWeight: '800', letterSpacing: 0.4 },
  circle: {
    width: 106,
    height: 106,
    borderRadius: 53,
    borderWidth: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleNum: {
    color: colors.text,
    fontSize: 23,
    fontWeight: '700',
    lineHeight: 26,
  },
  circleRule: {
    width: 34,
    height: 2,
    backgroundColor: colors.text,
    marginVertical: 1,
  },
});
