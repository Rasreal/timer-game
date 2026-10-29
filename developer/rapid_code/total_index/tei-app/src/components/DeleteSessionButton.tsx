import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { deleteSession } from '../lib/sessions';
import { useStore } from '../store';
import { colors } from '../theme';

/**
 * "Delete this session" under a calculator opened from Review, with an
 * in-app confirmation (a native alert would block the automation tooling and
 * looks foreign next to the app's own pop-ups).
 */
export function DeleteSessionButton({
  id,
  onDeleted,
}: {
  id: string;
  onDeleted: () => void;
}) {
  const { showToast } = useStore();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setDeleting(true);
    setError(null);
    const { error: message } = await deleteSession(id);
    setDeleting(false);
    if (message) {
      setError(message);
      return;
    }
    setConfirming(false);
    showToast('Session deleted.');
    onDeleted();
  }

  return (
    <>
      <Pressable
        onPress={() => setConfirming(true)}
        accessibilityRole="button"
        accessibilityLabel="Delete this session"
        hitSlop={8}
        style={styles.link}
      >
        <Text style={styles.linkText}>Delete this session</Text>
      </Pressable>

      <Modal
        visible={confirming}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirming(false)}
      >
        <View style={styles.scrim}>
          <View style={styles.card}>
            <Text style={styles.title}>Delete this session?</Text>
            <Text style={styles.body}>
              It will be removed from your Review calendar and totals. This
              cannot be undone.
            </Text>
            {error && <Text style={styles.error}>{error}</Text>}
            <View style={styles.actions}>
              <Pressable
                onPress={() => setConfirming(false)}
                disabled={deleting}
                accessibilityRole="button"
                accessibilityLabel="Keep session"
                style={styles.btn}
              >
                <Text style={styles.btnText}>KEEP</Text>
              </Pressable>
              <Pressable
                onPress={() => void remove()}
                disabled={deleting}
                accessibilityRole="button"
                accessibilityLabel="Confirm delete"
                style={[styles.btn, { borderColor: colors.red }]}
              >
                <Text style={[styles.btnText, { color: colors.red }]}>
                  {deleting ? 'DELETING…' : 'DELETE'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  link: { alignSelf: 'center', marginTop: 14 },
  linkText: { color: '#FF6B6B', fontSize: 15, textDecorationLine: 'underline' },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    padding: 22,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  body: { color: '#D0D0D0', fontSize: 16, lineHeight: 22, marginTop: 10 },
  error: { color: '#FF6B6B', fontSize: 14, marginTop: 10 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 22 },
  btn: {
    paddingVertical: 11,
    paddingHorizontal: 22,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#4A4A4A',
  },
  btnText: { color: colors.textDim, fontSize: 16, fontWeight: '700' },
});
