import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackArrow, DarkButton, Divider } from '../src/components/Chrome';
import { useStore } from '../src/store';
import {
  AEROBIC_LABEL,
  CALCULATOR_ROUTES,
  STRENGTH_OPTIONS,
  resolveCalculator,
  sessionDay,
  sessionMonthYear,
  sessionTime,
  type StrengthOption,
} from '../src/lib/selector';
import { colors } from '../src/theme';

/**
 * TEI Premium — "5 Types of Training Session Selector".
 *
 * Routes the user into one of the five calculators. The two pieces of state
 * are kept separate rather than as one list because the rules differ: the
 * strength options are radio-like (at most one), while aerobic is a free
 * toggle that may accompany any of them.
 */
export default function SessionType() {
  const router = useRouter();
  const { plan } = useLocalSearchParams<{ plan?: string }>();
  const insets = useSafeAreaInsets();
  const { session, showToast } = useStore();

  const [strength, setStrength] = useState<StrengthOption | null>(null);
  const [aerobic, setAerobic] = useState(false);

  const target = resolveCalculator({ strength, aerobic });

  function go() {
    if (!target) return;
    // When we arrived from the 7-day planner, carry the day through so the
    // calculator saves a PLAN for that date rather than a logged session.
    const route = plan
      ? `${CALCULATOR_ROUTES[target]}?plan=${plan}`
      : CALCULATOR_ROUTES[target];
    // The /calc/* screens are not yet in the generated typed-routes union.
    router.push(route as never);
  }

  function pickDateTime() {
    showToast('Date picking is not wired up in the prototype.');
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.orange }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: insets.top + 12,
        paddingHorizontal: 24,
        paddingBottom: Math.max(insets.bottom, 20) + 24,
      }}
    >
      <BackArrow onPress={() => router.back()} color="#7A4A12" />

      <Text style={styles.heading}>This Training Session</Text>

      <View style={{ alignItems: 'center' }}>
        <BevelCircle
          size={228}
          onPress={pickDateTime}
          label={`Session date, ${sessionMonthYear(session.date)} ${sessionDay(session.date)}`}
        >
          <Text style={styles.day}>{sessionDay(session.date)}</Text>
          <Text style={styles.monthYear}>{sessionMonthYear(session.date)}</Text>
        </BevelCircle>

        <BevelCircle
          size={150}
          onPress={pickDateTime}
          label={`Session time, ${sessionTime(session.date)}`}
          style={{ marginTop: 22 }}
        >
          <Text style={styles.time}>{sessionTime(session.date)}</Text>
        </BevelCircle>
      </View>

      <Text style={styles.subheading}>Type of Training Session</Text>

      <Text style={styles.instruction}>
        Select <Text style={styles.instructionBold}>1 Strength Training</Text>{' '}
        option and/or{' '}
        <Text style={styles.instructionBold}>1 Aerobic/Cardio Training</Text>{' '}
        option for this Training Session
      </Text>

      <Divider style={styles.rule} />

      <View style={styles.options}>
        {STRENGTH_OPTIONS.map((option) => (
          <CheckRow
            key={option.id}
            label={option.label}
            checked={strength === option.id}
            // Tapping the checked option clears it, so a mis-tap is undoable
            // without the screen having a "none" row.
            onPress={() =>
              setStrength((current) =>
                current === option.id ? null : option.id,
              )
            }
          />
        ))}

        <Text style={styles.separator}>-----</Text>

        <CheckRow
          label={AEROBIC_LABEL}
          checked={aerobic}
          onPress={() => setAerobic((v) => !v)}
        />
      </View>

      <View style={{ flex: 1, minHeight: 22 }} />

      <DarkButton
        title="Go To TEI Calculator"
        onPress={go}
        disabled={!target}
        style={{ alignSelf: 'center', minWidth: 264 }}
      />
    </ScrollView>
  );
}

/**
 * The bevelled date and time discs. The bevel is two stacked circles — an
 * outer graphite rim with a drop shadow and a darker inner well — matching the
 * hero ring on the entry screens.
 */
function BevelCircle({
  size,
  children,
  onPress,
  label,
  style,
}: {
  size: number;
  children: React.ReactNode;
  onPress: () => void;
  label: string;
  style?: object;
}) {
  const inset = Math.round(size * 0.1);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.bevelOuter,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.bevelWell,
          { top: inset, left: inset, right: inset, bottom: inset },
        ]}
      />
      <View style={{ alignItems: 'center' }}>{children}</View>
    </Pressable>
  );
}

function CheckRow({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={styles.box}>
        {checked && <Text style={styles.boxMark}>X</Text>}
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: '#111',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.6,
    marginTop: 10,
    marginBottom: 20,
  },
  bevelOuter: {
    backgroundColor: '#242424',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  bevelWell: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#17100A',
  },
  day: {
    color: colors.text,
    fontSize: 88,
    fontWeight: '700',
    letterSpacing: -3,
    lineHeight: 96,
  },
  monthYear: {
    color: colors.textDim,
    fontSize: 17,
    marginTop: -4,
  },
  time: {
    color: colors.text,
    fontSize: 38,
    fontWeight: '600',
    letterSpacing: -1,
    textAlign: 'center',
  },
  subheading: {
    color: '#111',
    fontSize: 27,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 24,
  },
  instruction: {
    color: '#1A1A1A',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 8,
  },
  instructionBold: { fontWeight: '800' },
  rule: {
    backgroundColor: '#7A4A12',
    marginTop: 14,
    marginHorizontal: 12,
  },
  options: { marginTop: 14, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  box: {
    width: 30,
    height: 30,
    borderRadius: 7,
    backgroundColor: '#242424',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxMark: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 18,
  },
  rowLabel: {
    flex: 1,
    color: '#111',
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  separator: {
    color: '#111',
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: 2,
    marginLeft: 44,
  },
});
