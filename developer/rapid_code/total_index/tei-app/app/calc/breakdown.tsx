import { useRouter } from 'expo-router';
import { ProgressRing } from '../../src/components/ProgressRing';
import { useStore } from '../../src/store';
import { CALCULATOR_LABELS, LIMITS, calculateBreakdownTei } from '../../src/lib/tei';
import { CalcShell, RingRow } from './_shared';

/**
 * Five rings wrap to three rows, which at the default 132pt pushed the CTA
 * row well below the fold. Shrinking them keeps the whole calculator on one
 * screen — ProgressRing scales its arc, number and ellipsis from `size`.
 */
const RING = 96;

/** PREMIUM — Breakdown Strength Training Session Calculator. */
export default function BreakdownCalculator() {
  const router = useRouter();
  const { session, setSessionField } = useStore();
  // Held in the shared store so a trip to a guided entry screen and back does
  // not lose the other values.
  const { sets, breakdowns, restSeconds, exertionPercent, cardioMinutes } = session;
  const setSets = (v: number | null) => setSessionField('sets', v);
  const setBreakdowns = (v: number | null) => setSessionField('breakdowns', v);
  const setRestSeconds = (v: number | null) => setSessionField('restSeconds', v);
  const setExertionPercent = (v: number | null) => setSessionField('exertionPercent', v);
  const setCardioMinutes = (v: number | null) => setSessionField('cardioMinutes', v);

  const complete =
    sets !== null &&
    breakdowns !== null &&
    restSeconds !== null &&
    exertionPercent !== null &&
    cardioMinutes !== null;


  return (
    <CalcShell
      calculator="breakdown"
      sessionLabel={`${CALCULATOR_LABELS.breakdown} Session`}
      complete={complete}
      compute={() =>
        calculateBreakdownTei({
          sets: sets ?? 0,
          breakdowns: breakdowns ?? 0,
          restSeconds: restSeconds ?? 0,
          exertionPercent: exertionPercent ?? 0,
          cardioMinutes: cardioMinutes ?? 0,
        }).tei
      }
      saveFields={{ sets, restSeconds, exertionPercent, cardioMinutes: cardioMinutes ?? 0,
          breakdowns,
        }}
      tightRings
    >
      <RingRow>
        <ProgressRing
          value={sets}
          label="Sets"
          onChange={setSets}
          onEllipsis={() => router.push('/entry/sets?from=breakdown' as never)}
          min={LIMITS.sets.min}
          max={LIMITS.sets.max}
          overAt={LIMITS.sets.overAt}
          size={RING}
        />
        <ProgressRing
          value={breakdowns}
          label="Breakdowns"
          onChange={setBreakdowns}
          onEllipsis={() => router.push('/entry/breakdowns?from=breakdown' as never)}
          min={LIMITS.breakdowns.min}
          max={LIMITS.breakdowns.max}
          overAt={LIMITS.breakdowns.overAt}
          size={RING}
        />
      </RingRow>

      <RingRow>
        <ProgressRing
          value={restSeconds}
          label="Seconds"
          onChange={setRestSeconds}
          onEllipsis={() => router.push('/entry/rest?from=breakdown' as never)}
          min={LIMITS.rest.min}
          max={LIMITS.rest.max}
          overAt={LIMITS.rest.max}
          // 0 means "not entered yet" (or the zero-fill of a cardio-only
          // session), so only a genuinely short rest is flagged — matching
          // the Standard calculator's Seconds ring.
          underAt={restSeconds !== null && restSeconds > 0 ? LIMITS.rest.underAt : undefined}
          size={RING}
        />
      </RingRow>

      <RingRow>
        <ProgressRing
          value={exertionPercent}
          label="% Exert"
          onChange={setExertionPercent}
          onEllipsis={() => router.push('/entry/exertion?from=breakdown' as never)}
          min={LIMITS.exertion.min}
          max={LIMITS.exertion.max}
          overAt={LIMITS.exertion.max}
          underAt={LIMITS.exertion.min}
          size={RING}
        />
        <ProgressRing
          value={cardioMinutes}
          label="Minutes"
          onChange={setCardioMinutes}
          onEllipsis={() => router.push('/entry/cardio?from=breakdown' as never)}
          min={LIMITS.cardio.min}
          max={LIMITS.cardio.max}
          overAt={LIMITS.cardio.overAt}
          size={RING}
        />
      </RingRow>
    </CalcShell>
  );
}
