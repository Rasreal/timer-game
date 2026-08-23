import type { CalculatorId } from './tei';

/**
 * The four mutually-exclusive strength options on the session-type selector.
 * Aerobic/Cardiovascular is deliberately absent: the deck's instruction line
 * ("Select 1 Strength Training option and/or 1 Aerobic/Cardio Training
 * option") makes it an independent toggle that combines with any one of these.
 */
export type StrengthOption = Extract<
  CalculatorId,
  'standard' | 'breakdown' | 'circuit' | 'yoga'
>;

export interface StrengthChoice {
  id: StrengthOption;
  label: string;
}

/** Labels for the four strength options, in the deck's order. */
export const STRENGTH_OPTIONS: readonly StrengthChoice[] = [
  { id: 'standard', label: 'Standard Strength Training' },
  { id: 'breakdown', label: 'Breakdown Strength Training' },
  { id: 'circuit', label: 'Circuit Strength Training' },
  { id: 'yoga', label: 'YOGA Training (strength option)' },
];

export const AEROBIC_LABEL = 'Aerobic/Cardiovascular Training';

export interface Selection {
  /** null when no strength option is checked. */
  strength: StrengthOption | null;
  aerobic: boolean;
}

/**
 * Which calculator the CTA opens. A strength pick always wins — its calculator
 * already takes cardio minutes as an input, so pairing the two needs no
 * separate destination. Aerobic alone is the Cardio ONLY calculator.
 */
export function resolveCalculator(selection: Selection): CalculatorId | null {
  if (selection.strength) return selection.strength;
  return selection.aerobic ? 'cardio' : null;
}

/** Route for each calculator; `/calc/*` are the TEI Premium screens. */
export const CALCULATOR_ROUTES: Record<CalculatorId, string> = {
  standard: '/calculator',
  breakdown: '/calc/breakdown',
  circuit: '/calc/circuit',
  yoga: '/calc/yoga',
  cardio: '/calc/cardio',
};

/** Day number for the big circle, e.g. "27". */
export function sessionDay(iso: string): string {
  return String(new Date(iso).getDate());
}

/** "April, 2026" — the caption under the day number. */
export function sessionMonthYear(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleString('en-US', { month: 'long' })}, ${d.getFullYear()}`;
}

/** "2:33 PM" for the smaller circle. */
export function sessionTime(iso: string): string {
  const d = new Date(iso);
  const hours = d.getHours();
  const mins = d.getMinutes().toString().padStart(2, '0');
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${mins} ${hours >= 12 ? 'PM' : 'AM'}`;
}
