/**
 * "Understanding YOUR Training" — the chart in Ken's 19 and 22 Oct 2026 edits
 * that maps a session TEI (2–33) to the effect it has and the reason someone
 * would train at that level. Bands measured off the row lines of his 22 Oct
 * graphic; the red Extreme band
 * starting above 22 matches `LIMITS.tei.overAt`.
 */

export interface TrainingBand {
  label: string;
  /** Inclusive TEI bounds. */
  from: number;
  to: number;
  color: string;
}

export const TRAINING_SCALE = { from: 2, to: 33 } as const;

export const TRAINING_EFFECTS: TrainingBand[] = [
  { label: 'Therapy/Health', from: 2, to: 5, color: '#3FC1EE' },
  { label: 'Maintenance', from: 6, to: 8, color: '#2BC46B' },
  { label: 'Change', from: 9, to: 12, color: '#8CD83F' },
  { label: 'Conditioning', from: 13, to: 17, color: '#F3E52B' },
  { label: 'Performance', from: 18, to: 22, color: '#F7A12C' },
  { label: 'Extreme', from: 23, to: 27, color: '#F2322F' },
  { label: 'Excessive', from: 28, to: 33, color: '#7A3EB8' },
];

export const TRAINING_REASONS: TrainingBand[] = [
  { label: 'GENERAL HEALTH', from: 2, to: 5, color: '#9FD3E3' },
  { label: 'IMPROVE AESTHETICS', from: 6, to: 14, color: '#C9DF95' },
  { label: 'ATHLETIC PERFORMANCE', from: 15, to: 25, color: '#D4BE78' },
  { label: 'DEATHWISH', from: 26, to: 33, color: '#3A1C3E' },
];

/** The effect band a session TEI falls in, clamped to the scale. */
export function effectFor(tei: number): TrainingBand {
  const t = Math.min(TRAINING_SCALE.to, Math.max(TRAINING_SCALE.from, Math.round(tei)));
  return TRAINING_EFFECTS.find((b) => t >= b.from && t <= b.to) ?? TRAINING_EFFECTS[0];
}
