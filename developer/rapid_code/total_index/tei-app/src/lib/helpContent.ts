/**
 * Copy for the pages behind the Home tiles' ellipsis options (Ken's 19 and 22
 * Oct 2026 edits). Ken said the wording in his mock-ups is placeholder and
 * that any explanatory screens needed may be created, so this is DRAFT copy
 * for him to approve or rewrite.
 */

export interface HelpTopic {
  title: string;
  paragraphs: string[];
  /** Short bullet lines shown after the paragraphs. */
  bullets?: string[];
  /** Video pages show a "coming soon" panel until Ken supplies the link. */
  video?: boolean;
  cta?: { label: string; route: string };
}

export const HELP_TOPICS = {
  'calculator-video': {
    title: 'How to use the TEI Standard Strength Calculator',
    video: true,
    paragraphs: [
      'Enter your Sets, the Seconds you rested between them, how hard the session felt (% Exert) and any cardio Minutes, then tap Calculate TEI.',
      'Not sure what a value means? Tap the ••• under any circle for a guided explanation.',
    ],
  },
  periods: {
    title: 'Per session, per week or per month',
    paragraphs: [
      'Every session gets its own TEI. Most single sessions land between 3 and 33.',
      'Sessions add up. Your weekly and monthly totals show your training load, and the Effective Ranges show where a healthy, productive total sits for each timeframe.',
      'Your % of Target compares your training with the lower end of the chosen range plus 10% — for a week, 60.5 TEI. For one session, that is a little over 20 TEI if you train three times a week.',
    ],
    bullets: [
      'Session — judge one workout',
      'Week — 55 to 111 TEI',
      'Month — 250 to 500 TEI',
    ],
    cta: { label: 'See Effective Ranges', route: '/ranges' },
  },
  exertion: {
    title: 'How important is “Perceived Exertion”?',
    paragraphs: [
      'Very. Perceived Exertion is how hard the whole session felt, from 50% (comfortable, you could go much longer) to 100% (all-out, nothing left).',
      'It multiplies the work you did, so the same sets and rest score higher when you push harder — and lower when you take it easy.',
      'Be honest and rate the session as a whole, not your hardest set. An honest number makes your TEI comparable from week to week.',
    ],
    bullets: ['50–60% — easy', '70% — moderate', '80% — hard', '90% — very hard', '100% — maximal'],
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
    title: 'Why we do not compare you to other participants (yet)',
    paragraphs: [
      'Everyone starts from a different place — age, training history, injuries and goals all change what a good TEI looks like.',
      'TEI measures your training against your own history and your own targets. Ranking people against each other would reward volume over intention, and that is not what TEI is for.',
      'We may add opt-in comparisons with athletes who share your goals later. For now, the only person to beat is last week’s you.',
    ],
  },
  upgrade: {
    title: 'Benefits of Upgrading',
    paragraphs: ['TEI Elemental scores any session. Upgrading keeps your history and turns it into insight.'],
    bullets: [
      'TEI Basic — save every session',
      'TEI Basic — Review calendar, weekly snapshot and 7 Days in Review',
      'TEI Basic — % of Target and your Last TEI on Home',
      'TEI Basic — correct a saved session',
      'TEI Premium (in development) — four more calculators, Plan TEI and plan-vs-actual grading',
    ],
    cta: { label: 'See TEI Plans', route: '/account-type' },
  },
} satisfies Record<string, HelpTopic>;

export type HelpTopicId = keyof typeof HELP_TOPICS;

export function helpTopic(id: string | undefined): HelpTopic | null {
  return id && id in HELP_TOPICS ? HELP_TOPICS[id as HelpTopicId] : null;
}
