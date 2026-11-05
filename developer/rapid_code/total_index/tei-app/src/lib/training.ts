/**
 * "Understanding YOUR Training" — the chart in Ken's 19, 22 and 30 Oct 2026
 * edits that maps a session TEI (2–33) to the effect it has and the reason
 * someone would train at that level. Bands measured off the row lines of his
 * 30 Oct graphics ("Workload Scale 2 to 33 with Gradients"); the red Extreme
 * band starting above 22 matches `LIMITS.tei.overAt`.
 */

export interface TrainingBand {
  label: string;
  /** Inclusive TEI bounds. */
  from: number;
  to: number;
  color: string;
  /** Ken's copy for the band's information icon (30 Oct 2026). */
  info: { title: string; body: string };
}

export const TRAINING_SCALE = { from: 2, to: 33 } as const;

export const TRAINING_EFFECTS: TrainingBand[] = [
  {
    label: 'Therapy/Health',
    from: 2,
    to: 5,
    color: '#3FC1EE',
    info: {
      title: 'Therapy/Health',
      body: "You're improving your health, addressing physical limitations, or rebuilding your ability to move and function comfortably.",
    },
  },
  {
    label: 'Maintenance',
    from: 6,
    to: 8,
    color: '#2BC46B',
    info: {
      title: 'Maintenance',
      body: "You're maintaining your current level of health, fitness, and physical ability without making significant changes.",
    },
  },
  {
    label: 'Change',
    from: 9,
    to: 12,
    color: '#8CD83F',
    info: {
      title: 'Change',
      body: "You're making noticeable changes in your body, health, or physical abilities through consistent training.",
    },
  },
  {
    label: 'Conditioning',
    from: 13,
    to: 17,
    color: '#F3E52B',
    info: {
      title: 'Conditioning',
      body: "You're building your capacity to handle physical demands with greater endurance, strength, and efficiency.",
    },
  },
  {
    label: 'Performance',
    from: 18,
    to: 22,
    color: '#F7A12C',
    info: {
      title: 'Performance',
      body: "You're improving your ability to perform, pushing your physical capabilities toward specific goals and measurable results.",
    },
  },
  {
    label: 'Extreme',
    from: 23,
    to: 27,
    color: '#F2322F',
    info: {
      title: 'Extreme',
      body: "You're pushing beyond typical training demands to pursue exceptional results, requiring greater recovery and careful management of risk.",
    },
  },
  {
    label: 'Excessive',
    from: 28,
    to: 33,
    color: '#7A3EB8',
    info: {
      title: 'Excessive',
      body: "You're pushing beyond what your body can reasonably handle, increasing the risk that injury and prolonged recovery outweigh your results.",
    },
  },
];

export const TRAINING_REASONS: TrainingBand[] = [
  {
    label: 'GENERAL HEALTH',
    from: 2,
    to: 5,
    color: '#9FD3E3',
    info: {
      title: 'General Health',
      body: 'This category helps you address physical limitations, improve your overall health, and build the strength and conditioning you need to live a longer, healthier, and more fulfilling life.',
    },
  },
  {
    label: 'IMPROVE AESTHETICS',
    from: 6,
    to: 14,
    color: '#C9DF95',
    info: {
      title: 'Improve Aesthetics',
      body: 'This category helps you make changes in the areas that matter most to you, from how you look and how much you weigh to how you sleep and perform. With consistent training, you can work toward your goals and better predict the results of your efforts.',
    },
  },
  {
    label: 'ATHLETIC PERFORMANCE',
    from: 15,
    to: 25,
    color: '#D4BE78',
    info: {
      title: 'Athletic Performance',
      body: 'This category helps you improve your ability to perform, whether that means building endurance, increasing your capacity for exertion, becoming more durable, moving more efficiently, or reaching your full athletic potential.',
    },
  },
  {
    label: 'BREAKING POINT',
    from: 26,
    to: 33,
    color: '#3A1C3E',
    info: {
      title: 'Breaking Point',
      body: 'This category explores what happens when you push beyond what your body can reasonably handle. You may achieve short-term results, but the risk of injury, prolonged recovery, and lasting negative effects can outweigh the benefits.',
    },
  },
];

/**
 * The Week & Month columns of Ken's second graphic: the weekly and monthly
 * TEI that a steady diet of each session score adds up to. Copied as drawn;
 * rows 11–22 line up with the weekly (55–111) and monthly (250–500)
 * Effective Ranges, the "Controllable Outcomes" box.
 */
export const WEEK_MONTH: Record<number, { week: number; month: number }> = {
  2: { week: 9, month: 45 },
  3: { week: 14, month: 68 },
  4: { week: 19, month: 91 },
  5: { week: 24, month: 114 },
  6: { week: 30, month: 136 },
  7: { week: 35, month: 159 },
  8: { week: 40, month: 182 },
  9: { week: 45, month: 205 },
  10: { week: 50, month: 227 },
  11: { week: 55, month: 250 },
  12: { week: 60, month: 273 },
  13: { week: 65, month: 295 },
  14: { week: 70, month: 318 },
  15: { week: 75, month: 341 },
  16: { week: 80, month: 364 },
  17: { week: 86, month: 386 },
  18: { week: 91, month: 409 },
  19: { week: 96, month: 432 },
  20: { week: 101, month: 455 },
  21: { week: 106, month: 477 },
  22: { week: 111, month: 500 },
  23: { week: 116, month: 523 },
  24: { week: 121, month: 545 },
  25: { week: 126, month: 568 },
  26: { week: 131, month: 591 },
  27: { week: 136, month: 614 },
  28: { week: 142, month: 636 },
  29: { week: 147, month: 659 },
  30: { week: 152, month: 682 },
  31: { week: 157, month: 705 },
  32: { week: 162, month: 727 },
  33: { week: 167, month: 750 },
};

/** The session rows Ken boxes as "Controllable Outcomes". */
export const CONTROLLABLE_OUTCOMES = { from: 11, to: 22 } as const;

/**
 * Background colours sampled row by row (TEI 2 → 33) off Ken's graphic. The
 * effect rainbow runs behind the effect column and the numbers; the reason
 * column has its own softer gradient that turns dark at BREAKING POINT.
 */
export const EFFECT_GRADIENT = [
  '#D5F3FF', // the white fade at the top of the chart
  '#AAE6FF', '#5BD2FF', '#00C9EC', '#00C8B0', '#13CB6B', '#3DCD25', '#59D800',
  '#6EE907', '#86F82D', '#A1FF32', '#BEFF2C', '#DBFF20', '#F2FF0E', '#FFFE00',
  '#FFF600', '#FFED00', '#FFE100', '#FFD300', '#FFC400', '#FFB100', '#FF9500',
  '#FF7500', '#FF5000', '#FF2400', '#F50024', '#CD2257', '#A73378', '#8B358D',
  '#75329D', '#6F30A0', '#7030A0', '#7030A0',
];

export const REASON_GRADIENT = [
  '#D7E4EA',
  '#C3DFEA', '#A0D6EA', '#77D2E2', '#77D1C7', '#72C499', '#84C57A', '#91CA69',
  '#9AD26C', '#A5D97D', '#B1DC7F', '#BFDC7C', '#CCDC77', '#D6DC6F', '#CECD5B',
  '#CECA5B', '#CEC65B', '#CEC15B', '#CEBA5B', '#CEB45B', '#CEAB5B', '#CE9E5B',
  '#CE905B', '#CE7F5B', '#CE6B5B', '#6E0010', '#5D0F27', '#4B1736', '#3F1840',
  '#361746', '#331648', '#331648', '#331648',
];

/** The effect band a session TEI falls in, clamped to the scale. */
export function effectFor(tei: number): TrainingBand {
  const t = Math.min(TRAINING_SCALE.to, Math.max(TRAINING_SCALE.from, Math.round(tei)));
  return TRAINING_EFFECTS.find((b) => t >= b.from && t <= b.to) ?? TRAINING_EFFECTS[0];
}
