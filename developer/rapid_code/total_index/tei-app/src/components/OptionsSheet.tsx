import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { OutlineButton } from './Chrome';
import { colors, useAccent } from '../theme';

export interface SheetOption {
  key: string;
  label: string;
}

/**
 * The "HELP" pop-up behind each Home tile's ellipsis (Ken's 19 and 22 Oct 2026
 * edits): a dark card over the Home grid with a radio list and one
 * "Select this … Option" button, in the style of the Plan day-tap pop-up he
 * asked to reuse.
 */
export function OptionsSheet({
  visible,
  title,
  options,
  selectLabel,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: SheetOption[];
  selectLabel: string;
  onSelect: (key: string) => void;
  onClose: () => void;
}) {
  const accent = useAccent();
  const [chosen, setChosen] = useState<string | null>(null);

  // Every opening starts with nothing ticked.
  useEffect(() => {
    if (visible) setChosen(null);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <View style={styles.card}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close options"
            hitSlop={14}
            style={styles.close}
          >
            <Text style={[styles.closeText, { color: accent }]}>✕</Text>
          </Pressable>

          <Text style={[styles.title, { color: accent }]}>{title}</Text>

          <View style={styles.list}>
            {options.map((option) => {
              const on = chosen === option.key;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => setChosen(option.key)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={option.label}
                  style={styles.option}
                >
                  <View style={[styles.radio, on && { borderColor: accent }]}>
                    {on && <View style={[styles.radioDot, { backgroundColor: accent }]} />}
                  </View>
                  <Text style={styles.optionText}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <OutlineButton
            title={selectLabel}
            disabled={chosen === null}
            onPress={() => {
              if (chosen) onSelect(chosen);
            }}
            style={styles.select}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  card: {
    backgroundColor: '#222222',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
  },
  close: { position: 'absolute', top: 10, right: 14 },
  closeText: { fontSize: 22, fontWeight: '300' },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  list: { marginTop: 14, gap: 4 },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.6,
    borderColor: '#BDBDBD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  optionText: { flex: 1, color: colors.text, fontSize: 16, lineHeight: 21 },
  select: { marginTop: 18 },
});
