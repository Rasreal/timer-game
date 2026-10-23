import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  DatePicker,
  clampDate,
  dayLabel,
  startOfDay,
  type DatePickerProps,
} from '../../src/components/DatePicker';

// Wednesday 21 October 2026, 9:30am local time.
const VALUE = new Date(2026, 9, 21, 9, 30);

function renderPicker(over: Partial<DatePickerProps> = {}) {
  const props: DatePickerProps = {
    visible: true,
    value: VALUE,
    onCancel: jest.fn(),
    onConfirm: jest.fn(),
    ...over,
  };
  const view = render(<DatePicker {...props} />);
  return { ...view, props };
}

const day = (label: string) => screen.getByLabelText(label);
const confirmed = (props: DatePickerProps) =>
  (props.onConfirm as jest.Mock).mock.calls[0][0] as Date;

describe('DatePicker helpers', () => {
  it('startOfDay drops the time of day', () => {
    expect(startOfDay(VALUE)).toEqual(new Date(2026, 9, 21));
  });

  it('clampDate keeps a moment inside the bounds', () => {
    const min = new Date(2026, 9, 1);
    const max = new Date(2026, 9, 31);
    expect(clampDate(new Date(2026, 8, 1), min, max)).toEqual(min);
    expect(clampDate(new Date(2026, 10, 1), min, max)).toEqual(max);
    expect(clampDate(VALUE, min, max)).toBe(VALUE);
    expect(clampDate(VALUE)).toBe(VALUE);
  });

  it('dayLabel reads as a long date', () => {
    expect(dayLabel(VALUE)).toBe('October 21, 2026');
  });
});

describe('DatePicker', () => {
  it('opens on the value month with that day selected', () => {
    renderPicker({ title: 'This Session' });
    expect(screen.getByText('This Session')).toBeTruthy();
    expect(screen.getByText('October 2026')).toBeTruthy();
    expect(day('October 21, 2026').props.accessibilityState).toMatchObject({
      selected: true,
      disabled: false,
    });
    expect(day('October 20, 2026').props.accessibilityState?.selected).toBe(false);
  });

  it('starts the week on Sunday', () => {
    renderPicker();
    // 1 October 2026 is a Thursday, so four blank cells lead the first row.
    expect(screen.getAllByText('S')).toHaveLength(2);
    expect(screen.getByText('October 2026')).toBeTruthy();
  });

  it('renders nothing while hidden', () => {
    renderPicker({ visible: false });
    expect(screen.queryByText('October 2026')).toBeNull();
  });

  it('confirms the tapped day at midnight when time is not offered', () => {
    const { props } = renderPicker();
    fireEvent.press(day('October 5, 2026'));
    fireEvent.press(screen.getByText('Done'));
    expect(confirmed(props)).toEqual(new Date(2026, 9, 5));
  });

  it('keeps the time of day when time is offered', () => {
    const { props } = renderPicker({ withTime: true });
    fireEvent.press(day('October 5, 2026'));
    fireEvent.press(screen.getByText('Done'));
    expect(confirmed(props)).toEqual(new Date(2026, 9, 5, 9, 30));
  });

  it('cancel reports nothing chosen', () => {
    const { props } = renderPicker();
    fireEvent.press(day('October 5, 2026'));
    fireEvent.press(screen.getByText('Cancel'));
    expect(props.onCancel).toHaveBeenCalled();
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it('disables days after maxDate and ignores presses on them', () => {
    const { props } = renderPicker({ maxDate: new Date(2026, 9, 22, 8, 0) });
    expect(day('October 22, 2026').props.accessibilityState?.disabled).toBe(false);
    expect(day('October 23, 2026').props.accessibilityState?.disabled).toBe(true);

    fireEvent.press(day('October 23, 2026'));
    fireEvent.press(screen.getByText('Done'));
    expect(confirmed(props)).toEqual(new Date(2026, 9, 21));
  });

  it('disables days before minDate', () => {
    renderPicker({ minDate: new Date(2026, 9, 20, 15, 0) });
    expect(day('October 19, 2026').props.accessibilityState?.disabled).toBe(true);
    // The bound is a day, not a moment: the rest of the 20th is selectable.
    expect(day('October 20, 2026').props.accessibilityState?.disabled).toBe(false);
  });

  it('cannot page past the bounds', () => {
    renderPicker({
      minDate: new Date(2026, 8, 15),
      maxDate: new Date(2026, 10, 2),
    });
    const prev = screen.getByLabelText('Previous month');
    const next = screen.getByLabelText('Next month');

    fireEvent.press(next);
    expect(screen.getByText('November 2026')).toBeTruthy();
    expect(next.props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(next);
    expect(screen.getByText('November 2026')).toBeTruthy();

    fireEvent.press(prev);
    fireEvent.press(prev);
    expect(screen.getByText('September 2026')).toBeTruthy();
    expect(prev.props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(prev);
    expect(screen.getByText('September 2026')).toBeTruthy();
  });

  it('pages freely without bounds', () => {
    renderPicker();
    fireEvent.press(screen.getByLabelText('Previous month'));
    expect(screen.getByText('September 2026')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Next month'));
    fireEvent.press(screen.getByLabelText('Next month'));
    fireEvent.press(day('November 3, 2026'));
    expect(day('November 3, 2026').props.accessibilityState?.selected).toBe(true);
  });

  it('opens on the bound month when the value lies outside it', () => {
    const { props } = renderPicker({ value: new Date(2026, 4, 4), minDate: new Date(2026, 9, 21) });
    expect(screen.getByText('October 2026')).toBeTruthy();
    fireEvent.press(screen.getByText('Done'));
    expect(confirmed(props)).toEqual(new Date(2026, 9, 21));
  });

  it('steps hours, minutes and am/pm', () => {
    const { props } = renderPicker({ withTime: true });
    expect(screen.getByLabelText('Time, 9:30am')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Later hour'));
    fireEvent.press(screen.getByLabelText('Later minutes'));
    expect(screen.getByLabelText('Time, 10:35am')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Earlier minutes'));
    fireEvent.press(screen.getByLabelText('Earlier minutes'));
    fireEvent.press(screen.getByLabelText('Earlier hour'));
    expect(screen.getByLabelText('Time, 9:25am')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Switch am/pm'));
    expect(screen.getByLabelText('Time, 9:25pm')).toBeTruthy();
    expect(screen.getByText('PM')).toBeTruthy();

    fireEvent.press(screen.getByText('Done'));
    expect(confirmed(props)).toEqual(new Date(2026, 9, 21, 21, 25));
  });

  it('wraps the time within the chosen day', () => {
    const { props } = renderPicker({ withTime: true, value: new Date(2026, 9, 21, 23, 30) });
    fireEvent.press(screen.getByLabelText('Later hour'));
    expect(screen.getByLabelText('Time, 12:30am')).toBeTruthy();
    fireEvent.press(screen.getByText('Done'));
    expect(confirmed(props)).toEqual(new Date(2026, 9, 21, 0, 30));
  });

  it('clamps a confirmed time past maxDate back to it', () => {
    const max = new Date(2026, 9, 21, 10, 0);
    const { props } = renderPicker({ withTime: true, maxDate: max });
    fireEvent.press(screen.getByLabelText('Later hour'));
    fireEvent.press(screen.getByLabelText('Later hour'));
    fireEvent.press(screen.getByText('Done'));
    expect(confirmed(props)).toEqual(max);
  });

  it('starts again from the value on every opening', () => {
    const props: DatePickerProps = {
      visible: true,
      value: VALUE,
      onCancel: jest.fn(),
      onConfirm: jest.fn(),
    };
    const view = render(<DatePicker {...props} />);
    fireEvent.press(day('October 5, 2026'));
    view.rerender(<DatePicker {...props} visible={false} />);
    view.rerender(<DatePicker {...props} visible />);
    expect(day('October 21, 2026').props.accessibilityState?.selected).toBe(true);
    expect(day('October 5, 2026').props.accessibilityState?.selected).toBe(false);
  });
});
