import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { BackArrow, DarkButton } from '../../src/components/Chrome';
import { Ring } from '../../src/components/Ring';
import { formatSessionDate, useStore, type SessionDraft } from '../../src/store';
import { LIMITS } from '../../src/lib/tei';
import { colors } from '../../src/theme';

type VariableKey =
  | 'sets'
  | 'rest'
  | 'exertion'
  | 'cardio'
  // Premium-only variables, reached from the /calc/* calculators.
  | 'breakdowns'
  | 'exercises'
  | 'circuits'
  | 'yoga';

interface VariableConfig {
  field: keyof Omit<SessionDraft, 'date'>;
  heading: string;
  ringLabel: string;
  description: string;
  example?: string;
  cta: string;
  /** Quick-pick chips shown on the Rest and Yoga screens. */
  presets?: number[];
  /** Copy under the chips; defaults to the Rest screen's wording. */
  presetHint?: string;
  showSlider?: boolean;
  overRange?: (v: number) => boolean;
  validate?: (v: number) => string | null;
}

const CONFIG: Record<VariableKey, VariableConfig> = {
  sets: {
    field: 'sets',
    heading: 'Total Strength Training Sets',
    ringLabel: 'Sets',
    description: 'Enter the Total Number of Sets in this Training Session',
    cta: 'Add SETS to TEI',
    overRange: (v) => v > LIMITS.sets.overAt,
    validate: (v) =>
      v < LIMITS.sets.min || v > LIMITS.sets.max
        ? `Enter a number between ${LIMITS.sets.min} and ${LIMITS.sets.max}.`
        : null,
  },
  rest: {
    field: 'restSeconds',
    heading: 'Average Rest Period',
    ringLabel: 'Seconds',
    description:
      'Average Number of Seconds YOU Rested between Sets During this Training Session',
    cta: 'Add REST to TEI',
    presets: [30, 60, 90, 120],
    // 0 means "not entered yet"; only a genuinely short rest is flagged.
    overRange: (v) => v > 0 && v < LIMITS.rest.min,
    validate: (v) =>
      v < LIMITS.rest.min || v > LIMITS.rest.max
        ? `Enter a number between ${LIMITS.rest.min} and ${LIMITS.rest.max}.`
        : null,
  },
  exertion: {
    field: 'exertionPercent',
    heading: 'Average % Perceived Exertion for Each Set of Strength Training',
    ringLabel: '% Exert',
    description: 'Estimate YOUR Average % Exertion per Set of Strength Training',
    cta: 'Add EXERTION to TEI',
    showSlider: true,
    // The valid band is 50-100, so either side of it is out of range.
    overRange: (v) => v < LIMITS.exertion.min || v > LIMITS.exertion.max,
    validate: (v) =>
      v < LIMITS.exertion.min || v > LIMITS.exertion.max
        ? 'Please enter a number between 50 and 100.'
        : null,
  },
  cardio: {
    field: 'cardioMinutes',
    heading: 'Total Cardio Volume',
    ringLabel: 'Minutes',
    description:
      'Total Number of Minutes of Cardiovascular Activity done in this Training Session',
    example:
      'EXAMPLE: 10-minute Warm Up walk and a 33-minute run after strength training equals 43 minutes of Cardio Activity (Enter "43")',
    cta: 'Add CARDIO to TEI',
    // Workbook README: cardio ranges 7-150, red gradient above 65.
    overRange: (v) => v > LIMITS.cardio.overAt,
    // 0 is a valid entry meaning "no cardio this session"; anything above 0
    // must clear the 7-minute floor.
    validate: (v) =>
      v !== 0 && (v < LIMITS.cardio.min || v > LIMITS.cardio.max)
        ? `Enter 0 for no cardio, or ${LIMITS.cardio.min}-${LIMITS.cardio.max} minutes.`
        : null,
  },
  breakdowns: {
    field: 'breakdowns',
    heading: 'Average Number of Breakdowns per Set',
    ringLabel: 'Breakdowns',
    description:
      'Average Number of Breakdowns of Weight or Micro-Rest for more Repetitions within a Set of an Exercise During this Training Session',
    example:
      'EXAMPLE: starting with 20 lbs in each hand, do as many curls as possible until fully exhausted, then quickly drop the 20 lbs and grab the 15 lbs dumbbells and repeat the process, then the 10 lbs... you managed only 2 repetitions, so that set is done. That would be 1 set with 2 Breakdowns (Enter "2")',
    cta: 'Add BREAKDOWNS to TEI',
    overRange: (v) => v > LIMITS.breakdowns.overAt,
    validate: (v) =>
      v < LIMITS.breakdowns.min || v > LIMITS.breakdowns.max
        ? `Enter a number between ${LIMITS.breakdowns.min} and ${LIMITS.breakdowns.max}.`
        : null,
  },
  exercises: {
    field: 'exercises',
    heading: 'Average Number of Exercises per Circuit',
    ringLabel: 'Exercises',
    description:
      'Enter the Total Number of Exercises per Circuit in this Training Session',
    cta: 'Add EXERCISES to TEI',
    overRange: (v) => v > LIMITS.exercises.overAt,
    validate: (v) =>
      v < LIMITS.exercises.min || v > LIMITS.exercises.max
        ? `Enter a number between ${LIMITS.exercises.min} and ${LIMITS.exercises.max}.`
        : null,
  },
  circuits: {
    field: 'circuits',
    heading: 'Total Number of Circuits',
    ringLabel: 'Circuits',
    description: 'Enter the Total Number of Circuits in this Training Session',
    cta: 'Add CIRCUITS to TEI',
    overRange: (v) => v > LIMITS.circuits.overAt,
    validate: (v) =>
      v < LIMITS.circuits.min || v > LIMITS.circuits.max
        ? `Enter a number between ${LIMITS.circuits.min} and ${LIMITS.circuits.max}.`
        : null,
  },
  yoga: {
    field: 'yogaMinutes',
    heading: 'Total Number of Minutes of YOGA',
    ringLabel: 'Yoga Mins',
    description:
      'Total Number of Minutes of YOGA Done During this Training Session',
    cta: 'Add YOGA to TEI',
    presets: [15, 30, 60, 90],
    presetHint: 'Enter any number between 4 and 100\ndirectly into the circle above.',
    overRange: (v) => v > LIMITS.yogaMinutes.overAt,
    validate: (v) =>
      v < LIMITS.yogaMinutes.min || v > LIMITS.yogaMinutes.max
        ? `Enter a number between ${LIMITS.yogaMinutes.min} and ${LIMITS.yogaMinutes.max}.`
        : null,
  },
};

/**
 * ELEMENTAL Screens 3-6 — the orange variable data-entry screens.
 * One route drives all four; they differ only in copy and helper controls.
 */
export default function VariableEntry() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { variable, from } = useLocalSearchParams<{
    variable: string;
    from?: string;
  }>();
  const { session, setSessionField } = useStore();

  // An id this route does not know used to fall through to `sets`, so a typo
  // or a CALCULATOR_FIELDS-style name (`restSeconds`) silently rendered the
  // SETS screen and wrote the user's rest value into `sets`. Fail visibly
  // instead of mis-writing the draft.
  const known = Boolean(variable) && variable in CONFIG;
  const key = (known ? variable : 'sets') as VariableKey;
  const config = CONFIG[key];

  const stored = session[config.field];
  const [value, setValue] = useState<number | null>(
    typeof stored === 'number'
      ? stored
      : // The exertion screen leads with a slider, so it needs a starting
        // position; the other screens open empty.
        config.showSlider
        ? 75
        : null,
  );

  const error = value !== null && config.validate ? config.validate(value) : null;
  const canAdd = value !== null && !error;

  // Exertion and cardio are shared by all five calculators, so the caller
  // tells us where to return via ?from=. Without it these screens always
  // dumped the user on the Standard calculator, losing the Circuit/Yoga/
  // Breakdown session they were part-way through entering.
  const RETURN_TO: Record<string, string> = {
    standard: '/calculator',
    breakdown: '/calc/breakdown',
    circuit: '/calc/circuit',
    cardio: '/calc/cardio',
    yoga: '/calc/yoga',
  };

  const backTo =
    (from && RETURN_TO[from]) ??
    // Variables unique to one calculator can infer their own owner.
    (key === 'breakdowns'
      ? '/calc/breakdown'
      : key === 'exercises' || key === 'circuits'
        ? '/calc/circuit'
        : key === 'yoga'
          ? '/calc/yoga'
          : '/calculator');

  function add() {
    if (!canAdd) return;
    setSessionField(config.field, value);
    router.replace(backTo as never);
  }

  if (!known) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.orange, paddingTop: insets.top + 12 }}>
        <BackArrow onPress={() => router.replace(backTo as never)} color="#7A4A12" />
        <View style={styles.unknownWrap}>
          <Text style={styles.heading}>Unknown Variable</Text>
          <Text style={styles.description}>
            “{variable ?? ''}” is not a TEI variable, so there is nothing to
            enter here.
          </Text>
          <DarkButton
            title="Go Back"
            onPress={() => router.replace(backTo as never)}
            style={{ alignSelf: 'center', minWidth: 264, marginTop: 24 }}
          />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.orange }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 12,
          paddingHorizontal: 24,
          paddingBottom: Math.max(insets.bottom, 20) + 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <BackArrow onPress={() => router.replace(backTo as never)} color="#7A4A12" />

        <Text
          style={[
            styles.heading,
            { fontSize: config.heading.length > 34 ? 26 : 30 },
          ]}
        >
          {config.heading}
        </Text>

        <View style={{ alignItems: 'center' }}>
          <Ring
            value={value}
            label={config.ringLabel}
            variant="hero"
            onChange={setValue}
            overRange={value !== null && !!config.overRange?.(value)}
          />
        </View>

        <Text style={styles.description}>{config.description}</Text>

        {config.example && <Text style={styles.example}>{config.example}</Text>}

        {config.showSlider && (
          <ExertionSlider value={value ?? 75} onChange={setValue} />
        )}

        <Text style={styles.date}>{formatSessionDate(session.date)}</Text>

        {config.presets && (
          <>
            <View style={styles.presetRow}>
              {config.presets.map((p) => {
                const active = value === p;
                return (
                  <Pressable
                    key={p}
                    onPress={() => setValue(p)}
                    accessibilityRole="button"
                    style={[
                      styles.preset,
                      active && { borderColor: '#111', borderWidth: 2 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetText,
                        { color: active ? colors.green : '#fff' },
                      ]}
                    >
                      {p}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.orText}>- or -</Text>
            <Text style={styles.presetHint}>
              {config.presetHint ??
                'Enter any number between 30 and 240\ndirectly into the circle above.'}
            </Text>
          </>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={{ flex: 1, minHeight: 18 }} />

        <DarkButton
          title={config.cta}
          onPress={add}
          disabled={!canAdd}
          style={{ alignSelf: 'center', minWidth: 264 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ExertionSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={{ marginTop: 18 }}>
      <View style={styles.sliderTrack}>
        <LinearGradient
          colors={['#3F4A35', '#5C8A35', '#81D742']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <Slider
        minimumValue={50}
        maximumValue={100}
        step={1}
        value={value}
        onValueChange={onChange}
        accessibilityLabel="Average percent perceived exertion"
        minimumTrackTintColor="transparent"
        maximumTrackTintColor="transparent"
        thumbTintColor={colors.green}
        style={styles.slider}
      />

      <View style={styles.markRow}>
        <Mark top="50%" bottom={'Getting\nDifficult'} align="left" />
        <Mark top="75%" bottom={'Muscle\nBurning'} align="center" />
        <Mark top="100%" bottom={'Last Rep\nPossible'} align="right" />
      </View>
    </View>
  );
}

function Mark({
  top,
  bottom,
  align,
}: {
  top: string;
  bottom: string;
  align: 'left' | 'center' | 'right';
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.markTop, { textAlign: align }]}>{top}</Text>
      <Text style={[styles.markBottom, { textAlign: align }]}>{bottom}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: '#111',
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.6,
    lineHeight: 34,
    marginTop: 12,
    marginBottom: 22,
  },
  description: {
    color: '#1A1A1A',
    fontSize: 22,
    textAlign: 'center',
    lineHeight: 27,
    marginTop: 22,
  },
  example: {
    color: '#242424',
    fontSize: 15.5,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 12,
  },
  date: {
    color: '#111',
    fontSize: 26,
    textAlign: 'center',
    marginTop: 16,
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 14,
  },
  preset: {
    backgroundColor: '#242424',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 14,
    minWidth: 74,
  },
  presetText: { fontSize: 32, fontWeight: '700', textAlign: 'center' },
  orText: { color: '#333', fontSize: 14, textAlign: 'center', marginTop: 6 },
  presetHint: {
    color: '#1C1C1C',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
  unknownWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  error: {
    color: '#8B0000',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 12,
  },
  sliderTrack: {
    height: 42,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#1A1A1A',
    overflow: 'hidden',
  },
  slider: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 42,
    width: '100%',
  },
  markRow: { flexDirection: 'row', marginTop: 6 },
  markTop: {
    color: '#111',
    fontSize: 18,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  markBottom: {
    color: '#2A2A2A',
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 17,
  },
});
