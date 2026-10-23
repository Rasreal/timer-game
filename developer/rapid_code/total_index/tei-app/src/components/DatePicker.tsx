import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, onAccentTint, useAccent } from '../theme';

/**
 * A calendar date (and optional time) picker drawn entirely in JS.
 *
 * The native pickers would add a native module, and the committed ios/ and
 * android/ projects would then need a rebuild before any of the date controls
 * worked. This one runs everywhere the app already does, web included.
 *
 * Weeks start on Sunday, matching the Review and Plan calendars.
 */
export interface DatePickerProps {
  visible: boolean;
  /** The date shown as selected when the picker opens. */
  value: Date;
  title?: string;
  /** Earliest selectable day (the time of day is ignored for the grid). */
  minDate?: Date;
  /** Latest selectable day (the time of day is ignored for the grid). */
  maxDate?: Date;
  /** Also offer hour, minute and am/pm controls. */
  withTime?: boolean;
  onCancel: () => void;
  /**
   * The chosen moment. Without `withTime` it is midnight of the chosen day.
   * It is always clamped to [minDate, maxDate].
   */
  onConfirm: (date: Date) => void;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MINUTE_STEP = 5;

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Keeps `d` inside the optional bounds, comparing exact moments. */
export function clampDate(d: Date, min?: Date, max?: Date): Date {
  if (min && d.getTime() < min.getTime()) return new Date(min);
  if (max && d.getTime() > max.getTime()) return new Date(max);
  return d;
}

/** "October 21, 2026" — the accessible name of a day cell. */
export function dayLabel(d: Date): string {
  return `${d.toLocaleString('en-US', { month: 'long' })} ${d.getDate()}, ${d.getFullYear()}`;
}

function monthIndex(d: Date): number {
  return d.getFullYear() * 12 + d.getMonth();
}

/** The month as rows of 7, with null for the cells outside it. */
function monthGrid(cursor: Date): (Date | null)[][] {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const lead = new Date(year, month, 1).getDay();
  const length = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= length; day++) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

function formatTime(d: Date): string {
  const hours = d.getHours();
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${d.getMinutes().toString().padStart(2, '0')}${hours >= 12 ? 'pm' : 'am'}`;
}

export function DatePicker({
  visible,
  value,
  title,
  minDate,
  maxDate,
  withTime = false,
  onCancel,
  onConfirm,
}: DatePickerProps) {
  const accent = useAccent();
  const onAccent = onAccentTint(accent);

  const minDay = minDate ? startOfDay(minDate) : undefined;
  const maxDay = maxDate ? startOfDay(maxDate) : undefined;

  const [draft, setDraft] = useState<Date>(() => clampDate(value, minDay, maxDate));
  const [cursor, setCursor] = useState<Date>(() => startOfDay(draft));

  // Every opening starts from the caller's current value, not whatever was
  // left behind by a cancelled visit.
  const valueTime = value.getTime();
  useEffect(() => {
    if (!visible) return;
    const start = clampDate(new Date(valueTime), minDay, maxDate);
    setDraft(start);
    setCursor(new Date(start.getFullYear(), start.getMonth(), 1));
    // The bounds are recreated each render; only a new opening or value matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, valueTime]);

  const grid = useMemo(() => monthGrid(cursor), [cursor]);

  const canGoBack = !minDay || monthIndex(cursor) > monthIndex(minDay);
  const canGoForward = !maxDay || monthIndex(cursor) < monthIndex(maxDay);

  function isDisabled(day: Date): boolean {
    return (
      (minDay !== undefined && day.getTime() < minDay.getTime()) ||
      (maxDay !== undefined && day.getTime() > maxDay.getTime())
    );
  }

  function shiftMonth(delta: number) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  }

  function pickDay(day: Date) {
    setDraft((d) => {
      const next = new Date(day);
      next.setHours(d.getHours(), d.getMinutes(), 0, 0);
      return next;
    });
  }

  function shiftTime(minutes: number) {
    setDraft((d) => {
      // Stay on the chosen day: wrap within it rather than rolling over.
      const total = d.getHours() * 60 + d.getMinutes() + minutes;
      const wrapped = ((total % 1440) + 1440) % 1440;
      return new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        Math.floor(wrapped / 60),
        wrapped % 60,
      );
    });
  }

  function confirm() {
    const chosen = withTime ? new Date(draft) : startOfDay(draft);
    chosen.setSeconds(0, 0);
    onConfirm(clampDate(chosen, withTime ? minDate : minDay, withTime ? maxDate : maxDay));
  }

  const monthTitle = `${cursor.toLocaleString('en-US', { month: 'long' })} ${cursor.getFullYear()}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {title ? <Text style={styles.title}>{title}</Text> : null}

          <View style={styles.monthRow}>
            <Pressable
              onPress={() => shiftMonth(-1)}
              disabled={!canGoBack}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              accessibilityState={{ disabled: !canGoBack }}
              hitSlop={12}
            >
              <Text style={[styles.arrow, { color: canGoBack ? accent : '#4A4A4A' }]}>‹</Text>
            </Pressable>
            <Text style={styles.monthTitle}>{monthTitle}</Text>
            <Pressable
              onPress={() => shiftMonth(1)}
              disabled={!canGoForward}
              accessibilityRole="button"
              accessibilityLabel="Next month"
              accessibilityState={{ disabled: !canGoForward }}
              hitSlop={12}
            >
              <Text style={[styles.arrow, { color: canGoForward ? accent : '#4A4A4A' }]}>›</Text>
            </Pressable>
          </View>

          <View style={styles.week}>
            {WEEKDAYS.map((w, i) => (
              <Text key={i} style={styles.weekday}>
                {w}
              </Text>
            ))}
          </View>

          {grid.map((row, r) => (
            <View key={r} style={styles.week}>
              {row.map((day, c) => {
                if (!day) return <View key={c} style={styles.cell} />;
                const disabled = isDisabled(day);
                const selected = startOfDay(draft).getTime() === day.getTime();
                return (
                  <Pressable
                    key={c}
                    onPress={() => pickDay(day)}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityLabel={dayLabel(day)}
                    accessibilityState={{ disabled, selected }}
                    style={styles.cell}
                  >
                    <View style={[styles.dayCircle, selected && { backgroundColor: accent }]}>
                      <Text
                        style={[
                          styles.dayText,
                          disabled && styles.dayTextDisabled,
                          selected && { color: onAccent, fontWeight: '700' },
                        ]}
                      >
                        {day.getDate()}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}

          {withTime && (
            <View style={styles.timeRow}>
              <Stepper label="hour" onDown={() => shiftTime(-60)} onUp={() => shiftTime(60)} />
              <Text style={styles.timeText} accessibilityLabel={`Time, ${formatTime(draft)}`}>
                {formatTime(draft)}
              </Text>
              <Stepper
                label="minutes"
                onDown={() => shiftTime(-MINUTE_STEP)}
                onUp={() => shiftTime(MINUTE_STEP)}
              />
              <Pressable
                onPress={() => shiftTime(draft.getHours() >= 12 ? -720 : 720)}
                accessibilityRole="button"
                accessibilityLabel="Switch am/pm"
                style={[styles.ampm, { borderColor: accent }]}
              >
                <Text style={{ color: accent, fontWeight: '600' }}>
                  {draft.getHours() >= 12 ? 'PM' : 'AM'}
                </Text>
              </Pressable>
            </View>
          )}

          <View style={styles.actions}>
            <Pressable onPress={onCancel} accessibilityRole="button" style={styles.action} hitSlop={8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={confirm} accessibilityRole="button" style={styles.action} hitSlop={8}>
              <Text style={[styles.doneText, { color: accent }]}>Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Stepper({ label, onDown, onUp }: { label: string; onDown: () => void; onUp: () => void }) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={onDown} accessibilityRole="button" accessibilityLabel={`Earlier ${label}`} hitSlop={8}>
        <Text style={styles.stepText}>−</Text>
      </Pressable>
      <Text style={styles.stepLabel}>{label === 'hour' ? 'hr' : 'min'}</Text>
      <Pressable onPress={onUp} accessibilityRole="button" accessibilityLabel={`Later ${label}`} hitSlop={8}>
        <Text style={styles.stepText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  card: {
    backgroundColor: colors.surface2,
    borderRadius: 18,
    padding: 18,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  title: { color: colors.text, fontSize: 20, fontWeight: '600', marginBottom: 10 },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  arrow: { fontSize: 34, lineHeight: 36, fontWeight: '300', paddingHorizontal: 8 },
  monthTitle: { color: colors.text, fontSize: 18, fontWeight: '600' },
  week: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: 6,
  },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 3 },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { color: colors.text, fontSize: 16 },
  dayTextDisabled: { color: '#4A4A4A' },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#3A3A3A',
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepText: { color: colors.text, fontSize: 24, fontWeight: '500', paddingHorizontal: 6 },
  stepLabel: { color: colors.textMuted, fontSize: 12 },
  timeText: { color: colors.text, fontSize: 20, fontWeight: '600', minWidth: 74, textAlign: 'center' },
  ampm: { borderWidth: 1, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 24 },
  action: { paddingVertical: 6 },
  cancelText: { color: colors.textMuted, fontSize: 17 },
  doneText: { fontSize: 17, fontWeight: '700' },
});
