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
    expect(screen.getByText('RHIN')).toBeTruthy();
    expect(screen.getByText('ATHLETICS')).toBeTruthy();
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

    expect(screen.getByText('Turn every workout into a score.')).toBeTruthy();
    expect(
      screen.getByText(
        'TEI (Total Effect Index) gives each workout a numerical value so you can measure effectiveness, avoid overtraining, and improve consistently.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('How it Works...')).toBeTruthy();
    expect(screen.getByText('1. Score Your Workout')).toBeTruthy();
    expect(
      screen.getByText('Sets, rest, and cardio are combined into one daily value'),
    ).toBeTruthy();
    expect(
      screen.getByText('2. Track Your Week, Month, Year, etc...'),
    ).toBeTruthy();
    expect(
      screen.getByText('Daily scores build your total training load'),
    ).toBeTruthy();
    expect(screen.getByText('3. Adjust & Improve')).toBeTruthy();
    expect(
      screen.getByText('Know when to push, recover, and get better results'),
    ).toBeTruthy();
    expect(
      screen.getByText('Stop guessing. Start training with data.'),
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
