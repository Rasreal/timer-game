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

type VariableKey = 'sets' | 'rest' | 'exertion' | 'cardio';

interface VariableConfig {
  field: keyof Omit<SessionDraft, 'date'>;
  heading: string;
  ringLabel: string;
  description: string;
  example?: string;
  cta: string;
  /** Quick-pick chips shown on the Rest screen. */
  presets?: number[];
  showSlider?: boolean;
  overRange?: (v: number) => boolean;
  validate?: (v: number) => string | null;
}

const CONFIG: Record<VariableKey, VariableConfig> = {
  sets: {
    field: 'sets',
    heading: 'Total Strength Trainng Sets',
    ringLabel: 'Sets',
    description: 'Enter the Total Number of Sets in this Training Session',
    cta: 'Add SETS to TEI',
    overRange: (v) => v > LIMITS.sets.overAt,
  },
  rest: {
    field: 'restSeconds',
    heading: 'Average Rest Period',
    ringLabel: 'Seconds',
    description:
      'Average Number of Seconds YOU Rested between Sets During this Training Session',
    cta: 'Add REST to TEI',
    presets: [30, 60, 90, 120],
    overRange: (v) => v < LIMITS.rest.min,
    validate: (v) =>
      v < LIMITS.rest.min || v > LIMITS.rest.max
        ? `Enter a number between ${LIMITS.rest.min} and ${LIMITS.rest.max}.`
        : null,
  },
  exertion: {
    field: 'exertionPercent',
    heading: 'Average % Perceived Exertion for Each Set of Strenth Training',
    ringLabel: '% Exert',
    description: 'Estimate YOUR Average % Exertion per Set of Strength Training',
    cta: 'Add EXERTION to TEI',
    showSlider: true,
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
  },
};

/**
 * ELEMENTAL Screens 3-6 — the orange variable data-entry screens.
 * One route drives all four; they differ only in copy and helper controls.
 */
export default function VariableEntry() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { variable } = useLocalSearchParams<{ variable: string }>();
  const { session, setSessionField } = useStore();

  const key = (
    variable && variable in CONFIG ? variable : 'sets'
  ) as VariableKey;
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

  function add() {
    if (!canAdd) return;
    setSessionField(config.field, value);
    router.replace('/calculator');
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
        <BackArrow onPress={() => router.replace('/calculator')} color="#7A4A12" />

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
              Enter any number between 30 and 240{'\n'}directly into the circle
              above.
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
    paddingVertical: 4,
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
