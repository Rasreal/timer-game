import { fireEvent, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import InfoPage from '../../app/info/[topic]';
import AthleteQuiz from '../../app/athlete-quiz';
import TrainingScaleScreen from '../../app/training-scale';
import { HELP_TOPICS } from '../../src/lib/helpContent';
import { ATHLETE_IDENTITIES, QUIZ, athleteIdentity, quizScore } from '../../src/lib/quiz';
import {
  CONTROLLABLE_OUTCOMES,
  TRAINING_EFFECTS,
  TRAINING_REASONS,
  WEEK_MONTH,
  effectFor,
} from '../../src/lib/training';
import { EFFECTIVE_RANGES, LIMITS } from '../../src/lib/tei';
import { renderMain } from '../helpers/mainRender';

beforeEach(() => {
  (router as unknown as { canGoBack: jest.Mock }).canGoBack = jest.fn(() => true);
});

describe('help pop-ups behind the tile ellipses', () => {
  it.each(Object.entries(HELP_TOPICS))('renders "%s"', (id, topic) => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ topic: id });
    renderMain(<InfoPage />);
    expect(screen.getByText(topic.title)).toBeTruthy();
    if ('video' in topic && topic.video) {
      expect(screen.getByText('Video coming soon')).toBeTruthy();
    }
  });

  it("uses Ken's 30 Oct copy, typos corrected", () => {
    const all = Object.values(HELP_TOPICS)
      .flatMap((t) => [...t.paragraphs, ...('sections' in t ? t.sections.flatMap((s) => [s.lead, s.body]) : [])])
      .join(' ');
    expect(all).toContain('somewhere between 2 and 33 for the Total Effect Index');
    expect(all).toContain('understand the effect their efforts have');
    expect(all).toContain('predict when you may acquire them');
    expect(all).toContain('they are YOUR Magic Numbers');
    expect(all).toContain('Personalize your TEI experience with 11 inspiring accent colors.');
    expect(all).not.toContain('the affect their');
    expect(all).not.toContain('when my may');
  });

  it('renders a bold lead-in and the upgrade sections', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ topic: 'compare' });
    renderMain(<InfoPage />);
    expect(screen.getByText('This is Your TEI:')).toBeTruthy();
    expect(screen.queryByText(/\*\*/)).toBeNull();

    screen.unmount();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ topic: 'upgrade' });
    renderMain(<InfoPage />);
    expect(screen.getByText('Elemental to Basic')).toBeTruthy();
    expect(screen.getByText('Turn Workload Intelligence into purposeful action.')).toBeTruthy();
  });

  it('opens Effective Ranges from the Per Session pop-up, replacing it', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ topic: 'periods' });
    renderMain(<InfoPage />);
    fireEvent.press(screen.getByText('Effective Ranges'));
    expect(router.replace).toHaveBeenCalledWith('/ranges');
  });

  it('closes with the cross', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ topic: 'exertion' });
    renderMain(<InfoPage />);
    fireEvent.press(screen.getByLabelText('Close'));
    expect(router.back).toHaveBeenCalled();
  });

  it('copes with an unknown topic', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ topic: 'nope' });
    renderMain(<InfoPage />);
    expect(screen.getByText('This page could not be found.')).toBeTruthy();
  });
});

describe('Understanding YOUR Training', () => {
  it('covers every TEI from 2 to 33 exactly once in both columns', () => {
    for (const bands of [TRAINING_EFFECTS, TRAINING_REASONS]) {
      expect(bands[0].from).toBe(2);
      expect(bands[bands.length - 1].to).toBe(33);
      for (let i = 1; i < bands.length; i++) {
        expect(bands[i].from).toBe(bands[i - 1].to + 1);
      }
    }
  });

  it("uses the band boundaries and names from Ken's 30 Oct graphic", () => {
    const bounds = (bands: typeof TRAINING_EFFECTS) => bands.map((b) => [b.label, b.from, b.to]);
    expect(bounds(TRAINING_EFFECTS)).toEqual([
      ['Therapy/Health', 2, 5],
      ['Maintenance', 6, 8],
      ['Change', 9, 12],
      ['Conditioning', 13, 17],
      ['Performance', 18, 22],
      ['Extreme', 23, 27],
      ['Excessive', 28, 33],
    ]);
    expect(bounds(TRAINING_REASONS)).toEqual([
      ['GENERAL HEALTH', 2, 5],
      ['IMPROVE AESTHETICS', 6, 14],
      ['ATHLETIC PERFORMANCE', 15, 25],
      ['BREAKING POINT', 26, 33],
    ]);
  });

  it('turns Extreme exactly where the calculators turn red', () => {
    expect(effectFor(LIMITS.tei.overAt).label).toBe('Performance');
    expect(effectFor(LIMITS.tei.overAt + 1).label).toBe('Extreme');
    expect(effectFor(0).label).toBe('Therapy/Health');
    expect(effectFor(99).label).toBe('Excessive');
  });

  it('boxes exactly the rows that fall in the weekly and monthly Effective Ranges', () => {
    const weekly = EFFECTIVE_RANGES.find((r) => r.label === 'WEEKLY')!;
    const monthly = EFFECTIVE_RANGES.find((r) => r.label === 'MONTHLY')!;
    for (let tei = 2; tei <= 33; tei++) {
      const { week, month } = WEEK_MONTH[tei];
      const boxed = tei >= CONTROLLABLE_OUTCOMES.from && tei <= CONTROLLABLE_OUTCOMES.to;
      expect(week >= weekly.min && week <= weekly.max).toBe(boxed);
      expect(month >= monthly.min && month <= monthly.max).toBe(boxed);
    }
  });

  it('gives every reason and effect its information copy', () => {
    for (const band of [...TRAINING_REASONS, ...TRAINING_EFFECTS]) {
      expect(band.info.body.length).toBeGreaterThan(40);
    }
  });

  it('shows Per Session first, and the Week & Month columns on the switch', () => {
    renderMain(<TrainingScaleScreen />);
    expect(screen.getByText('Understanding YOUR Training')).toBeTruthy();
    expect(screen.getByText('TEI')).toBeTruthy();
    expect(screen.queryByText('TOTAL EFFECT INDEX')).toBeNull();

    fireEvent(screen.getByLabelText('Show Week and Month'), 'valueChange', true);
    fireEvent(screen.getByTestId('training-chart'), 'layout', {
      nativeEvent: { layout: { width: 380, height: 700, x: 0, y: 0 } },
    });
    expect(screen.getByText('TOTAL EFFECT INDEX')).toBeTruthy();
    expect(screen.getByText('750')).toBeTruthy();
    expect(screen.getByLabelText('Controllable Outcomes: TEI 11 to 22 per session')).toBeTruthy();

    fireEvent.press(screen.getByText('Per Session'));
    expect(screen.queryByText('TOTAL EFFECT INDEX')).toBeNull();
  });

  it('opens a hint from an information icon', () => {
    renderMain(<TrainingScaleScreen />);
    fireEvent.press(screen.getByLabelText('BREAKING POINT, TEI 26 to 33'));
    expect(screen.getByText('Breaking Point')).toBeTruthy();
    expect(screen.getByText(/push beyond what your body can reasonably handle/)).toBeTruthy();

    fireEvent.press(screen.getAllByLabelText('Close').at(-1)!);
    expect(screen.queryByText('Breaking Point')).toBeNull();
  });

  it('closes with the cross', () => {
    renderMain(<TrainingScaleScreen />);
    fireEvent.press(screen.getByLabelText('Close'));
    expect(router.back).toHaveBeenCalled();
  });
});

describe('What Kind of Athlete Are You?', () => {
  it('scores each answer 1 to 4 and maps the total onto the four identities', () => {
    expect(quizScore([0, 0, 0, 0])).toBe(4);
    expect(quizScore([3, 3, 3, 3])).toBe(16);
    expect(athleteIdentity(7).name).toBe('The Emerging Athlete');
    expect(athleteIdentity(8).name).toBe('The Intentional Athlete');
    expect(athleteIdentity(13).name).toBe('The Developing Athlete');
    expect(athleteIdentity(14).name).toBe('The Integrated Athlete');
    // The bands cover 4–16 without gaps.
    for (let i = 1; i < ATHLETE_IDENTITIES.length; i++) {
      expect(ATHLETE_IDENTITIES[i].from).toBe(ATHLETE_IDENTITIES[i - 1].to + 1);
    }
  });

  it('needs every question answered before showing a result', () => {
    renderMain(<AthleteQuiz />);

    fireEvent.press(screen.getByText('See My Result'));
    expect(screen.queryByText('Your ATHLETE IDENTITY')).toBeNull();

    for (const q of QUIZ) fireEvent.press(screen.getByLabelText(q.answers[2]));
    fireEvent.press(screen.getByText('See My Result'));

    expect(screen.getByText('Your ATHLETE IDENTITY')).toBeTruthy();
    expect(screen.getByText('The Developing Athlete')).toBeTruthy();
    expect(screen.getByText(/Reflection score: 12\/16\./)).toBeTruthy();
  });

  it('can be retaken', () => {
    renderMain(<AthleteQuiz />);
    for (const q of QUIZ) fireEvent.press(screen.getByLabelText(q.answers[0]));
    fireEvent.press(screen.getByText('See My Result'));
    expect(screen.getByText('The Emerging Athlete')).toBeTruthy();

    fireEvent.press(screen.getByText('Take the quiz again'));
    expect(screen.getByText(QUIZ[0].question, { exact: false })).toBeTruthy();
  });
});
