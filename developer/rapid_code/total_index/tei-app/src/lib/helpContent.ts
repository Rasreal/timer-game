/**
 * Copy for the pop-ups behind the Home tiles' ellipsis options. Calculate,
 * Review and Profile use Ken's final copy from his 30 Oct 2026 edits ("Required
 * Copy for Ellipses and Information Icons", two typos corrected). The Plan
 * topics are still DRAFT copy for him to approve, and the "How to use" videos
 * are to be produced at the end of the Beta Test.
 *
 * A paragraph may open with a **bold lead-in**, as in Ken's pop-up boxes.
 */

export interface HelpTopic {
  title: string;
  paragraphs: string[];
  /** Headed blocks, e.g. the two upgrade steps. */
  sections?: { heading: string; lead: string; body: string }[];
  /** Short bullet lines shown after the paragraphs. */
  bullets?: string[];
  /** Video pages show a "coming soon" panel until Ken supplies the link. */
  video?: boolean;
  cta?: { label: string; route: string };
}

export const HELP_TOPICS = {
  periods: {
    title: 'Per Session, Per Week, Per Month',
    paragraphs: [
      'Generally speaking ideal Per Session values you might calculate will be somewhere between 2 and 33 for the Total Effect Index value of that session.',
      'The mission of **TEI** is to help people understand the effect their efforts have on their Health, Fitness, and Conditioning over time. Tap this button to see what effective TEI ranges are for different timeframes; weekly, monthly, quarterly, Semi-Annually and Annually.',
    ],
    cta: { label: 'Effective Ranges', route: '/ranges' },
  },
  exertion: {
    title: 'How important is “Perceived Exertion”?',
    paragraphs: [
      '**Perceived Exertion** is one of the MOST IMPORTANT and powerful influences on all aspects of your health, fitness and conditioning journey. How you perceive or feel about your experience literally changes how your body responds to the stimulus of your activities and your efforts.',
      'Having a way to rate or define your exertion level can give you control of the effectiveness of all your activities and efforts - you can even control the kinds of results you will experience, and predict when you may acquire them.',
    ],
  },
  'calculator-video': {
    title: 'How to use TEI Standard Strength Calculator',
    video: true,
    paragraphs: [
      'Enter your Sets, the Seconds you rested between them, how hard the session felt (% Exert) and any cardio Minutes, then tap Calculate TEI.',
      'Not sure what a value means? Tap the ••• under any circle for a guided explanation.',
    ],
  },
  'review-video': {
    title: 'How to use TEI Review',
    video: true,
    paragraphs: [
      'Tap a day on the calendar to see that week’s total. Double-tap a day to see the week’s sessions. Press and hold a day to open its session and correct it.',
    ],
  },
  'plan-video': {
    title: 'How to use Plan TEI',
    video: true,
    paragraphs: [
      'Tap a day on the Plan calendar to design that day’s Target TEI, or open the 7 Day Planner to plan a whole week at once.',
    ],
  },
  'plan-review': {
    title: 'How Plan and Review work together',
    paragraphs: [
      'Plan sets a Target TEI for a day. Review shows what you actually did.',
      'On the Review calendar, each day’s score is colored by how it landed against its plan, so you can see at a glance whether you trained as intended.',
    ],
    bullets: ['White — under plan', 'Yellow — close to plan', 'Green — on plan', 'Red — over plan'],
  },
  'plan-target': {
    title: 'Setting your weekly Target',
    paragraphs: [
      'A good week sits inside the weekly Effective Range of 55 to 111 TEI.',
      'If you are building up, aim for the lower end plus 10% — about 60 TEI — spread across three or more sessions, and add load gradually from week to week.',
    ],
    cta: { label: 'See Effective Ranges', route: '/ranges' },
  },
  'profile-video': {
    title: 'How to use TEI Profile',
    video: true,
    paragraphs: [
      'Your Profile holds your name, email, accent color and subscription. Tap Edit to change your details.',
    ],
  },
  compare: {
    title: 'Why we do not compare to other participants (yet)',
    paragraphs: [
      '**This is Your TEI:** Everything we do at RHINO ATHLETICS is about helping the individual person find the things that work for them to BE, Be Better, and Be their Best in Life.',
      'When you find your “Magic Numbers”, they are YOUR Magic Numbers. They may not be Magic for anyone else. So we have found that comparing numbers can be misleading, discouraging, and even intimidating – which are never productive for Personal Development and Maximum Performance.',
      'But if we can figure out a way to assure clarity and appreciation of the differences, we will definitely encourage comparisons.',
    ],
  },
  upgrade: {
    title: 'Benefits of Upgrading',
    paragraphs: [],
    sections: [
      {
        heading: 'Elemental to Basic',
        lead: 'Turn past experiences into future progress.',
        body: 'Save your training sessions, review your workload over time, and discover insights that help you make better decisions about what comes next.',
      },
      {
        heading: 'Basic to Premium',
        lead: 'Turn Workload Intelligence into purposeful action.',
        body: 'Measure different types of training, plan future workloads, set meaningful targets, and compare your results over time. Personalize your TEI experience with 11 inspiring accent colors.',
      },
    ],
    cta: { label: 'See TEI Plans', route: '/account-type' },
  },
} satisfies Record<string, HelpTopic>;

export type HelpTopicId = keyof typeof HELP_TOPICS;

export function helpTopic(id: string | undefined): HelpTopic | null {
  return id && id in HELP_TOPICS ? HELP_TOPICS[id as HelpTopicId] : null;
}
