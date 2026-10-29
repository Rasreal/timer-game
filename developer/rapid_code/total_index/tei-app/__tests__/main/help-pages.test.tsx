import { fireEvent, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import InfoPage from '../../app/info/[topic]';
import AthleteQuiz from '../../app/athlete-quiz';
import TrainingScaleScreen from '../../app/training-scale';
import { HELP_TOPICS } from '../../src/lib/helpContent';
import { QUIZ, quizResult } from '../../src/lib/quiz';
import { TRAINING_EFFECTS, TRAINING_REASONS, effectFor } from '../../src/lib/training';
import { LIMITS } from '../../src/lib/tei';
import { renderMain } from '../helpers/mainRender';

beforeEach(() => {
  (router as unknown as { canGoBack: jest.Mock }).canGoBack = jest.fn(() => true);
});

describe('help pages behind the tile ellipses', () => {
  it.each(Object.entries(HELP_TOPICS))('renders "%s"', (id, topic) => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ topic: id });
    renderMain(<InfoPage />);
    expect(screen.getByText(topic.title)).toBeTruthy();
    if ('video' in topic && topic.video) {
      expect(screen.getByText('Video coming soon')).toBeTruthy();
    }
  });

  it('follows a page call to action', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ topic: 'upgrade' });
    renderMain(<InfoPage />);
    fireEvent.press(screen.getByText('See TEI Plans'));
    expect(router.push).toHaveBeenCalledWith('/account-type');
  });

  it('copes with an unknown topic', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ topic: 'nope' });
    renderMain(<InfoPage />);
    expect(screen.getByText('This page could not be found.')).toBeTruthy();
  });

  it('states the per-session share of the weekly target correctly', () => {
    // 55 + 10% = 60.5 per week; a third of that is a little over 20.
    expect(HELP_TOPICS.periods.paragraphs.join(' ')).toContain('60.5');
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

  it('turns Extreme exactly where the calculators turn red', () => {
    expect(effectFor(LIMITS.tei.overAt).label).toBe('Performance');
    expect(effectFor(LIMITS.tei.overAt + 1).label).toBe('Extreme');
    expect(effectFor(0).label).toBe('Therapy/Health');
    expect(effectFor(99).label).toBe('Excessive');
  });

  it('renders the chart with a close cross', () => {
    renderMain(<TrainingScaleScreen />);
    expect(screen.getByText('Understanding YOUR Training')).toBeTruthy();
    expect(screen.getByLabelText('DEATHWISH, TEI 26 to 33')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Close'));
    expect(router.back).toHaveBeenCalled();
  });
});

describe('What kind of athlete are you?', () => {
  it('picks the reason most answers point at, ties going to the harder one', () => {
    expect(quizResult([0, 0, 1, 2])).toBe(0);
    expect(quizResult([1, 1, 2, 0])).toBe(1);
    expect(quizResult([0, 2, 0, 2])).toBe(2);
  });

  it('needs every question answered before showing a result', () => {
    renderMain(<AthleteQuiz />);

    fireEvent.press(screen.getByText('See My Result'));
    expect(screen.queryByText('You are a')).toBeNull();

    for (const q of QUIZ) fireEvent.press(screen.getByLabelText(q.answers[2]));
    fireEvent.press(screen.getByText('See My Result'));

    expect(screen.getByText('Performance Athlete')).toBeTruthy();
    expect(screen.getByText('ATHLETIC PERFORMANCE')).toBeTruthy();
    expect(screen.getByText('TEI 13–25 per session')).toBeTruthy();
  });

  it('can be retaken', () => {
    renderMain(<AthleteQuiz />);
    for (const q of QUIZ) fireEvent.press(screen.getByLabelText(q.answers[0]));
    fireEvent.press(screen.getByText('See My Result'));
    expect(screen.getByText('Health Athlete')).toBeTruthy();

    fireEvent.press(screen.getByText('Take the quiz again'));
    expect(screen.getByText(QUIZ[0].question, { exact: false })).toBeTruthy();
  });
});
