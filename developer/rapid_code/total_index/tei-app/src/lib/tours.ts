import type { TourStep } from '../components/Tour';

/**
 * The words in each first-time tour, top to bottom on each screen: Ken's
 * 11 Nov 2026 "Thought Bubble Tour", with his copy adjustments of 24 Nov
 * 2026. Text between ** and ** shows in bold. Changing the text here changes
 * it everywhere.
 *
 * All five calculators share the "calculator" tour, so it shows once. The
 * Cardio ONLY tip points at the Standard calculator's Minutes ring, so the
 * Premium calculators show the first four (see CALC_SHELL_TOUR).
 */
const THREE_DOTS = 'Tap any **3 dots** for more information about that feature or item.';
const TIMEFRAMES = 'Weekly, Monthly, Quarterly, Semi-Annually, and Annually.';

export const TOURS = {
  home: [
    { target: 'last', text: 'Your last TEI score shows here.' },
    {
      target: 'calculate',
      text: 'Tap **Calculate Session** to score a training or activity session.',
    },
    { target: 'menu', text: THREE_DOTS },
    { target: 'profile', text: 'Replay these tips any time from Profile.' },
  ],
  calculator: [
    { target: 'interpret', text: 'Tap **Interpret Score** to see what your score means.' },
    {
      target: 'ranges',
      text: `Tap the **Effective Ranges** button to see TEI Total values based on timeframes; ${TIMEFRAMES}`,
    },
    { target: 'rings', text: THREE_DOTS, pointAt: 0.25 },
    { target: 'calculate', text: 'Fill in every circle, then tap **Calculate TEI**.', pointAt: 0.25 },
    {
      target: 'minutes',
      text: 'For **Cardio ONLY** sessions, Tap the double-dash in the middle of the Minutes Ring and enter your value, then Tap the Calculate TEI button.',
    },
  ],
  trainingScale: [
    { target: 'info', text: 'Tap any “i” for more information.' },
    { target: 'switch', text: 'Switch to **Week & Month** to see the longer timeframes.' },
  ],
  review: [
    { target: 'months', text: 'Use the arrows to move between months.' },
    {
      target: 'week',
      text: '**Tap** any day to see that week’s TEI Total at the bottom of the screen; or **Double Tap** any day to see all the sessions of that week; or **Touch & Hold** any day to see, edit or delete the calculated session(s) from that day.',
    },
    {
      target: 'ranges',
      text: `See the **Effective Ranges** of TEI Total values based on timeframes; ${TIMEFRAMES}`,
    },
  ],
  plan: [
    { target: 'months', text: 'Use the arrows to move between months.' },
    { target: 'week', text: 'Tap a day to plan your TEI for that week.' },
    { target: 'ranges', text: 'See the Effective Ranges to aim for.' },
  ],
  ranges: [
    {
      target: 'timeframe',
      text: 'Tap the timeframe you are interested in monitoring on your Calculate Session, then scroll to the bottom of the screen and Tap the **TEI Calculator** button; or Tap the BACK Arrow to return to the previous screen.',
    },
  ],
} satisfies Record<string, TourStep[]>;

/** The Premium calculators have no Standard Minutes ring to point at. */
export const CALC_SHELL_TOUR: TourStep[] = TOURS.calculator.filter((s) => s.target !== 'minutes');
