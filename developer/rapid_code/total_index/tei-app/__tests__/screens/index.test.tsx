import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderScreen } from '../helpers/render';

jest.mock('../../src/lib/supabase', () => ({ supabase: {} }));

import Launch from '../../app/index';

describe('app/index.tsx — Onboarding Launch Screen', () => {
  it('renders without crashing', () => {
    expect(() => renderScreen(<Launch />)).not.toThrow();
  });

  it('shows the brand lockup, the TEI lockup and both CTAs', () => {
    renderScreen(<Launch />);

    // "Mission. Simple." is one Text with a nested Text; RNTL matches the leaf.
    expect(screen.getByText('Simple.')).toBeTruthy();
    expect(screen.getByLabelText('RHINO ATHLETICS')).toBeTruthy();
    expect(screen.getByText('Total Effect Index')).toBeTruthy();
    expect(screen.getByText('TEI')).toBeTruthy();
    expect(screen.getByText(/GO\s+TEI/)).toBeTruthy();
    expect(screen.getByText(/What is/)).toBeTruthy();
  });

  it('renders the rhino hero with its accessibility label', () => {
    renderScreen(<Launch />);
    expect(screen.getByLabelText('Rhino Athletics')).toBeTruthy();
  });

  it('GO TEI pushes /login', () => {
    renderScreen(<Launch />);
    fireEvent.press(screen.getByText(/GO\s+TEI/));
    expect(router.push).toHaveBeenCalledWith('/login');
  });

  it('"What is TEI" opens the modal instead of navigating', () => {
    renderScreen(<Launch />);
    expect(screen.queryByText('What is TEI?')).toBeNull();

    fireEvent.press(screen.getByText(/What is/));

    expect(screen.getByText('What is TEI?')).toBeTruthy();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('the What is TEI sheet renders the three "How it Works" steps and copy', () => {
    renderScreen(<Launch />);
    fireEvent.press(screen.getByText(/What is/));

    expect(
      screen.getByText('Know the work. Understand the impact.'),
    ).toBeTruthy();
    expect(
      screen.getByText(
        /brings Workload Intelligence to your training\. By measuring individual workouts and cumulative training load/,
      ),
    ).toBeTruthy();
    expect(screen.getByText('How it Works...')).toBeTruthy();
    expect(screen.getByText('1. Score Your Workout')).toBeTruthy();
    expect(
      screen.getByText('Sets, rest, and cardio contribute to one daily value.'),
    ).toBeTruthy();
    expect(screen.getByText('2. Track Your Training Load')).toBeTruthy();
    expect(
      screen.getByText(
        'See how your workload accumulates over days, weeks, and months.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('3. Understand & Adjust')).toBeTruthy();
    expect(
      screen.getByText(
        'Compare workloads, recognize trends, and make informed training decisions.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText('Train with Intention.\nProgress with Intelligence.'),
    ).toBeTruthy();
    expect(screen.getByText('See My TEI')).toBeTruthy();
  });

  it('"See My TEI" closes the sheet and pushes /login', () => {
    renderScreen(<Launch />);
    fireEvent.press(screen.getByText(/What is/));
    fireEvent.press(screen.getByText('See My TEI'));

    expect(router.push).toHaveBeenCalledWith('/login');
    expect(screen.queryByText('What is TEI?')).toBeNull();
  });

  it('the sheet close button dismisses it without navigating', () => {
    renderScreen(<Launch />);
    fireEvent.press(screen.getByText(/What is/));

    fireEvent.press(screen.getByLabelText('Close'));

    expect(screen.queryByText('What is TEI?')).toBeNull();
    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
