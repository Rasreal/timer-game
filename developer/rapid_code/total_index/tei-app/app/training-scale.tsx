import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrainingScale } from '../src/components/TrainingScale';
import { colors, useAccent } from '../src/theme';

/**
 * "How to interpret your TEI score" — the Understanding YOUR Training chart
 * from Ken's 19/22 Oct 2026 edits, as a full-screen card with a close cross.
 */
export default function TrainingScaleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const accent = useAccent();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingHorizontal: 18,
        paddingBottom: Math.max(insets.bottom, 16) + 16,
      }}
    >
      <View style={styles.card}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={14}
          style={styles.close}
        >
          <Text style={[styles.closeText, { color: accent }]}>✕</Text>
        </Pressable>
        <TrainingScale />
      </View>

      <Text style={styles.body}>
        Find your session&rsquo;s TEI on the right, then read across: the middle
        column is the effect that session has on your body, and the left column
        is the reason someone would train at that level. Most training sits
        between 6 and 22. Sessions above 22 are extreme and need recovery after;
        above 33 is beyond a survivable workload, so check how you entered your
        data.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2A2A2A',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#444',
    padding: 14,
    paddingTop: 18,
  },
  close: { position: 'absolute', top: 8, right: 12, zIndex: 1 },
  closeText: { fontSize: 22, fontWeight: '300' },
  body: { color: '#CFCFCF', fontSize: 15, lineHeight: 22, marginTop: 18 },
});
