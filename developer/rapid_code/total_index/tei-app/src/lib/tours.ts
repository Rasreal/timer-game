import type { TourStep } from '../components/Tour';

/**
 * The words in each first-time tour (Ken's 11 Nov 2026 "Thought Bubble
 * Tour"), top to bottom on each screen. Ken wrote the calculator's three-dots
 * bubble and the chart's "i" bubble; the rest are drafted in the same voice
 * for him to approve. Changing the text here changes it everywhere.
 *
 * All five calculators share the "calculator" tour, so it shows once.
 */
export const TOURS = {
  home: [
    { target: 'last', text: 'Your last TEI score shows here.' },
    { target: 'calculate', text: 'Tap Calculate Session to score a workout.' },
    { target: 'menu', text: 'Tap any three dots for help with that feature.' },
    { target: 'profile', text: 'Replay these tips any time from Profile.' },
  ],
  calculator: [
    { target: 'interpret', text: 'Tap Interpret Score to see what your score means.' },
    { target: 'ranges', text: 'Tap Effective Ranges to see the TEI to aim for.' },
    { target: 'rings', text: 'Tap any three dots for more information.', pointAt: 0.25 },
    { target: 'calculate', text: 'Fill in every circle, then tap Calculate TEI.', pointAt: 0.25 },
  ],
  trainingScale: [
    { target: 'info', text: 'Tap any “i” for more information.' },
    { target: 'switch', text: 'Switch to Week & Month to see the longer timeframes.' },
  ],
  review: [
    { target: 'months', text: 'Use the arrows to move between months.' },
    {
      target: 'week',
      text: 'Tap a day to see its sessions, or the dot beside a week to see its total.',
    },
    { target: 'ranges', text: 'See the Effective Ranges to aim for.' },
  ],
  plan: [
    { target: 'months', text: 'Use the arrows to move between months.' },
    { target: 'week', text: 'Tap a day to plan your TEI for that week.' },
    { target: 'ranges', text: 'See the Effective Ranges to aim for.' },
  ],
} satisfies Record<string, TourStep[]>;
