/**
 * Each answer points at one of the chart's reasons for training:
 * 0 GENERAL HEALTH, 1 IMPROVE AESTHETICS, 2 ATHLETIC PERFORMANCE.
 *
 * DRAFT questions for Ken to approve — his edits asked for "a 3 or 4
 * question quiz" without the questions.
 */
export const QUIZ: { question: string; answers: string[] }[] = [
  {
    question: 'What is the main reason you train?',
    answers: [
      'To feel healthy and move well',
      'To look better and change my body',
      'To perform better in my sport or event',
    ],
  },
  {
    question: 'How often do you train right now?',
    answers: ['1–2 times a week', '3–4 times a week', '5 or more times a week'],
  },
  {
    question: 'How do you want to feel after a typical session?',
    answers: [
      'Refreshed and energized',
      'Worked, but ready for the rest of my day',
      'Fully spent — I left it all out there',
    ],
  },
  {
    question: 'What would you most like to improve in the next 3 months?',
    answers: [
      'Energy, mobility and everyday health',
      'Strength, shape and body composition',
      'Speed, power and endurance',
    ],
  },
];

export const QUIZ_RESULTS = [
  {
    name: 'Health Athlete',
    advice:
      'Consistency beats intensity for you. Most of your sessions belong in the Therapy/Health and Maintenance effects, with the occasional harder day.',
  },
  {
    name: 'Aesthetic Athlete',
    advice:
      'You change your body by stacking productive sessions week after week. Aim most sessions at the Change and Conditioning effects, and keep your weekly total inside the Effective Range.',
  },
  {
    name: 'Performance Athlete',
    advice:
      'You can handle high loads, which makes recovery part of your training. Conditioning and Performance sessions build you up; plan a lighter day after anything above 22.',
  },
];

/** The reason most answers pointed at; ties go to the more demanding one. */
export function quizResult(answers: number[]): number {
  const counts = [0, 0, 0];
  for (const a of answers) counts[a] += 1;
  let best = 0;
  counts.forEach((c, i) => {
    if (c >= counts[best]) best = i;
  });
  return best;
}
