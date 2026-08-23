import { useRouter } from 'expo-router';
import { ProgressRing } from '../../src/components/ProgressRing';
import { useStore } from '../../src/store';
import { CALCULATOR_LABELS, LIMITS, calculateCardioTei } from '../../src/lib/tei';
import { CalcShell, RingRow } from './_shared';

/** PREMIUM — Cardio ONLY Training Session Calculator. */
export default function CardioCalculator() {
  const router = useRouter();
  const { session, setSessionField } = useStore();
  // Held in the shared store so a trip to a guided entry screen and back
  // does not lose the other values.
  const { cardioMinutes } = session;
  const setCardioMinutes = (v: number | null) => setSessionField('cardioMinutes', v);

  return (
    <CalcShell
      calculator="cardio"
      sessionLabel={`${CALCULATOR_LABELS.cardio} Session`}
      complete={cardioMinutes !== null}
      compute={() => calculateCardioTei({ cardioMinutes: cardioMinutes ?? 0 }).tei}
      saveFields={{ cardioMinutes: cardioMinutes ?? 0 }}
    >
      <RingRow>
        <ProgressRing
          value={cardioMinutes}
          label="Minutes"
          onChange={setCardioMinutes}
          onEllipsis={() => router.push('/entry/cardio?from=cardio' as never)}
          min={LIMITS.cardio.min}
          max={LIMITS.cardio.max}
          overAt={LIMITS.cardio.overAt}
          size={236}
        />
      </RingRow>
    </CalcShell>
  );
}
