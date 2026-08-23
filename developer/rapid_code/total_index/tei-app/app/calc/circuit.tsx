import { useRouter } from 'expo-router';
import { ProgressRing } from '../../src/components/ProgressRing';
import { useStore } from '../../src/store';
import { CALCULATOR_LABELS, LIMITS, calculateCircuitTei } from '../../src/lib/tei';
import { CalcShell, RingRow } from './_shared';

/** PREMIUM — Circuit Strength Training Session Calculator. */
export default function CircuitCalculator() {
  const router = useRouter();
  const { session, setSessionField, showToast } = useStore();
  // Held in the shared store so a trip to a guided entry screen and back
  // does not lose the other values.
  const { exercises, circuits, exertionPercent, cardioMinutes } = session;
  const setExercises = (v: number | null) => setSessionField('exercises', v);
  const setCircuits = (v: number | null) => setSessionField('circuits', v);
  const setExertionPercent = (v: number | null) => setSessionField('exertionPercent', v);
  const setCardioMinutes = (v: number | null) => setSessionField('cardioMinutes', v);

  const complete =
    exercises !== null &&
    circuits !== null &&
    exertionPercent !== null &&
    cardioMinutes !== null;

  const guided = () => showToast('Guided entry for this variable is not wired up yet.');

  return (
    <CalcShell
      calculator="circuit"
      sessionLabel={`${CALCULATOR_LABELS.circuit} Session`}
      complete={complete}
      compute={() =>
        calculateCircuitTei({
          exercises: exercises ?? 0,
          circuits: circuits ?? 0,
          exertionPercent: exertionPercent ?? 0,
          cardioMinutes: cardioMinutes ?? 0,
        }).tei
      }
      saveFields={{ exertionPercent, cardioMinutes: cardioMinutes ?? 0,
          exercises,
          circuits,
        }}
    >
      <RingRow>
        <ProgressRing
          value={exercises}
          label="Exercises"
          onChange={setExercises}
          onEllipsis={() => router.push('/entry/exercises?from=circuit' as never)}
          min={LIMITS.exercises.min}
          max={LIMITS.exercises.max}
          overAt={LIMITS.exercises.overAt}
        />
        <ProgressRing
          value={circuits}
          label="Circuits"
          onChange={setCircuits}
          onEllipsis={() => router.push('/entry/circuits?from=circuit' as never)}
          min={LIMITS.circuits.min}
          max={LIMITS.circuits.max}
          overAt={LIMITS.circuits.overAt}
        />
      </RingRow>

      <RingRow>
        <ProgressRing
          value={exertionPercent}
          label="% Exert"
          onChange={setExertionPercent}
          onEllipsis={() => router.push('/entry/exertion?from=circuit' as never)}
          min={LIMITS.exertion.min}
          max={LIMITS.exertion.max}
          overAt={LIMITS.exertion.max}
          underAt={LIMITS.exertion.min}
        />
        <ProgressRing
          value={cardioMinutes}
          label="Minutes"
          onChange={setCardioMinutes}
          onEllipsis={() => router.push('/entry/cardio?from=circuit' as never)}
          min={LIMITS.cardio.min}
          max={LIMITS.cardio.max}
          overAt={LIMITS.cardio.overAt}
        />
      </RingRow>
    </CalcShell>
  );
}
