import { useRouter } from 'expo-router';
import { ProgressRing } from '../../src/components/ProgressRing';
import { useStore } from '../../src/store';
import { CALCULATOR_LABELS, LIMITS, calculateYogaTei } from '../../src/lib/tei';
import { CalcShell, RingRow } from './_shared';

/** PREMIUM — YOGA Training Session Calculator. */
export default function YogaCalculator() {
  const router = useRouter();
  const { session, setSessionField, showToast } = useStore();
  // Held in the shared store so a trip to a guided entry screen and back
  // does not lose the other values.
  const { yogaMinutes, exertionPercent, cardioMinutes } = session;
  const setYogaMinutes = (v: number | null) => setSessionField('yogaMinutes', v);
  const setExertionPercent = (v: number | null) => setSessionField('exertionPercent', v);
  const setCardioMinutes = (v: number | null) => setSessionField('cardioMinutes', v);

  const complete =
    yogaMinutes !== null && exertionPercent !== null && cardioMinutes !== null;

  const guided = () => showToast('Guided entry for this variable is not wired up yet.');

  return (
    <CalcShell
      calculator="yoga"
      sessionLabel={CALCULATOR_LABELS.yoga}
      complete={complete}
      compute={() =>
        calculateYogaTei({
          yogaMinutes: yogaMinutes ?? 0,
          exertionPercent: exertionPercent ?? 0,
          cardioMinutes: cardioMinutes ?? 0,
        }).tei
      }
      saveFields={{ exertionPercent, cardioMinutes: cardioMinutes ?? 0,
          yogaMinutes,
        }}
      showRangesPill
    >
      <RingRow>
        <ProgressRing
          value={yogaMinutes}
          label="Yoga Mins"
          onChange={setYogaMinutes}
          onEllipsis={() => router.push('/entry/yoga?from=yoga' as never)}
          min={LIMITS.yogaMinutes.min}
          max={LIMITS.yogaMinutes.max}
          overAt={LIMITS.yogaMinutes.overAt}
          size={186}
        />
      </RingRow>

      <RingRow>
        <ProgressRing
          value={exertionPercent}
          label="% Exert"
          onChange={setExertionPercent}
          onEllipsis={() => router.push('/entry/exertion?from=yoga' as never)}
          min={LIMITS.exertion.min}
          max={LIMITS.exertion.max}
          overAt={LIMITS.exertion.max}
          underAt={LIMITS.exertion.min}
        />
        <ProgressRing
          value={cardioMinutes}
          label="Minutes"
          onChange={setCardioMinutes}
          onEllipsis={() => router.push('/entry/cardio?from=yoga' as never)}
          min={LIMITS.cardio.min}
          max={LIMITS.cardio.max}
          overAt={LIMITS.cardio.overAt}
        />
      </RingRow>
    </CalcShell>
  );
}
