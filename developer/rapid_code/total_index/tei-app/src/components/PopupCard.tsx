import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, useAccent } from '../theme';

/**
 * The dark pop-up card used for Ken's "Information Button Pop Up" copy (30 Oct
 * 2026 edits), styled like the Home ellipsis options card it opens from.
 */
export function PopupCard({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const accent = useAccent();
  return (
    <View style={styles.card}>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
        hitSlop={14}
        style={styles.close}
      >
        <Text style={[styles.closeText, { color: accent }]}>✕</Text>
      </Pressable>
      <ScrollView bounces={false} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: accent }]}>{title}</Text>
        {children}
      </ScrollView>
    </View>
  );
}

/** A dimmed backdrop that centres a PopupCard; tapping outside closes. */
export function PopupScrim({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <View style={styles.scrim}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityLabel="Dismiss"
        accessible={false}
      />
      {children}
    </View>
  );
}

/** One short explanation in a modal card: the chart's information icons. */
export function InfoPopup({
  info,
  onClose,
}: {
  info: { title: string; body: string } | null;
  onClose: () => void;
}) {
  return (
    <Modal visible={info !== null} transparent animationType="fade" onRequestClose={onClose}>
      <PopupScrim onClose={onClose}>
        {info && (
          <PopupCard title={info.title} onClose={onClose}>
            <Text style={popupText.body}>{info.body}</Text>
          </PopupCard>
        )}
      </PopupScrim>
    </Modal>
  );
}

/** Body text styles shared by every pop-up. */
export const popupText = StyleSheet.create({
  body: { color: '#E2E2E2', fontSize: 16, lineHeight: 23, marginTop: 10 },
  bold: { color: colors.text, fontWeight: '700' },
  heading: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 16 },
});

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 26,
    paddingVertical: 60,
  },
  card: {
    maxHeight: '100%',
    backgroundColor: '#222222',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  content: { paddingHorizontal: 20, paddingTop: 30, paddingBottom: 22 },
  close: { position: 'absolute', top: 10, right: 14, zIndex: 1 },
  closeText: { fontSize: 22, fontWeight: '300' },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3, paddingRight: 24 },
});
