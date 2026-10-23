import { fireEvent, screen } from '@testing-library/react-native';
import { dayLabel } from '../../src/components/DatePicker';

/**
 * Drives an open `DatePicker` to the 15th of the previous month — always in
 * the past, whatever today is — and confirms it.
 *
 * Returns the moment the picker should report: that day at the time of day
 * of `current` (the value the picker opened on), seconds dropped.
 */
export function pickFifteenthOfLastMonth(current: Date): Date {
  const now = new Date();
  const target = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    15,
    current.getHours(),
    current.getMinutes(),
  );
  fireEvent.press(screen.getByLabelText('Previous month'));
  fireEvent.press(screen.getByLabelText(dayLabel(target)));
  fireEvent.press(screen.getByText('Done'));
  return target;
}

/** Today's day cell, plus tomorrow's when it falls in the same month. */
export function todayAndTomorrowCells() {
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  return {
    today: screen.getByLabelText(dayLabel(today)),
    tomorrow:
      tomorrow.getMonth() === today.getMonth()
        ? screen.getByLabelText(dayLabel(tomorrow))
        : null,
  };
}
