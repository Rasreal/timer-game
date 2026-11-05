/**
 * "What Kind of Athlete Are You?" — Ken's quiz copy from his 30 Oct 2026
 * edits. Each question's answers run from least to most purposeful and score
 * 1–4, so a full quiz scores 4–16.
 */
export const QUIZ_TITLE = 'What Kind of Athlete Are You?';
export const QUIZ_SUBTITLE = 'Four questions. Four athlete identities. No sports required.';

export const QUIZ: { question: string; answers: string[] }[] = [
  {
    question: 'How often do you consider the purpose behind your actions?',
    answers: [
      'Rarely. I generally respond to whatever needs doing.',
      'Sometimes. Certain activities have clear purposes for me.',
      'Often. I usually connect my actions to something meaningful.',
      'Almost always. Purpose consciously guides my choices.',
    ],
  },
  {
    question: 'How closely do your daily actions reflect the person you want to become?',
    answers: [
      "I haven't given that relationship much consideration.",
      'Some of my habits reflect the person I want to become.',
      'I consciously develop habits that support my aspirations.',
      'I consistently organize and refine my actions around those aspirations.',
    ],
  },
  {
    question: 'What best describes your approach to personal growth?',
    answers: [
      "I don't regularly think about improving myself.",
      'I welcome opportunities to improve when they arise.',
      'I actively pursue challenges and opportunities that help me grow.',
      'The desire to BE Better consistently influences how I approach life.',
    ],
  },
  {
    question: "When your efforts aren't producing the results you want, what do you typically do?",
    answers: [
      'I often lose interest or move on.',
      'I try something different when the frustration becomes significant.',
      "I examine what isn't working and make adjustments.",
      'I see feedback, setbacks, and adaptation as essential parts of development.',
    ],
  },
];

export const QUIZ_MAX = QUIZ.length * 4;

/**
 * The four identities with Ken's preliminary scoring bands ("not public
 * facing"; to be refined once real answers come in).
 */
export const ATHLETE_IDENTITIES = [
  {
    name: 'The Emerging Athlete',
    from: 4,
    to: 7,
    summary:
      'You may not yet consistently connect your everyday actions to a larger purpose. Your athleticism, in this sense, is a capacity waiting to be developed.',
  },
  {
    name: 'The Intentional Athlete',
    from: 8,
    to: 10,
    summary:
      'You recognize the value of purposeful action and apply it in selected areas of life. Your next opportunity is greater consistency.',
  },
  {
    name: 'The Developing Athlete',
    from: 11,
    to: 13,
    summary:
      'Purpose, challenge, and improvement already influence many of your decisions. You are actively developing your athletic identity.',
  },
  {
    name: 'The Integrated Athlete',
    from: 14,
    to: 16,
    summary:
      'Purposeful action and intentional development appear deeply integrated into your daily life. You approach growth as an ongoing practice.',
  },
] as const;

export const QUIZ_DISCLAIMER = 'Exploratory self-assessment; not a validated psychological measure.';

/** Total score for the chosen answers (each answer index 0–3 scores 1–4). */
export function quizScore(answers: number[]): number {
  return answers.reduce((sum, a) => sum + a + 1, 0);
}

/** The identity a score falls in. */
export function athleteIdentity(score: number) {
  return (
    ATHLETE_IDENTITIES.find((i) => score >= i.from && score <= i.to) ??
    (score < ATHLETE_IDENTITIES[0].from ? ATHLETE_IDENTITIES[0] : ATHLETE_IDENTITIES[3])
  );
}
