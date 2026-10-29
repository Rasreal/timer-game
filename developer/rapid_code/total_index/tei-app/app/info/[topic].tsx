import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackArrow, OutlineButton } from '../../src/components/Chrome';
import { helpTopic } from '../../src/lib/helpContent';
import { colors, useAccent } from '../../src/theme';

/**
 * One explanatory page behind a Home tile's ellipsis option. The copy lives in
 * src/lib/helpContent.ts; video topics show a placeholder until Ken supplies
 * the videos.
 */
export default function InfoPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const accent = useAccent();
  const { topic: id } = useLocalSearchParams<{ topic?: string }>();
  const topic = helpTopic(id);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + 6,
        paddingHorizontal: 22,
        paddingBottom: Math.max(insets.bottom, 16) + 20,
      }}
    >
      <BackArrow onPress={back} />

      {!topic ? (
        <Text style={styles.body}>This page could not be found.</Text>
      ) : (
        <>
          <Text style={styles.title}>{topic.title}</Text>

          {topic.video && (
            <View style={[styles.video, { borderColor: accent }]}>
              <Text style={[styles.play, { color: accent }]}>▶</Text>
              <Text style={styles.videoText}>Video coming soon</Text>
            </View>
          )}

          {topic.paragraphs.map((p) => (
            <Text key={p} style={styles.body}>
              {p}
            </Text>
          ))}

          {topic.bullets && (
            <View style={styles.bullets}>
              {topic.bullets.map((b) => (
                <View key={b} style={styles.bulletRow}>
                  <View style={[styles.bulletDot, { backgroundColor: accent }]} />
                  <Text style={styles.bulletText}>{b}</Text>
                </View>
              ))}
            </View>
          )}

          {topic.cta && (
            <OutlineButton
              title={topic.cta.label}
              onPress={() => router.push(topic.cta!.route as never)}
              style={{ marginTop: 26 }}
            />
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 35,
    marginTop: 8,
    marginBottom: 6,
  },
  video: {
    height: 180,
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
    marginVertical: 12,
  },
  play: { fontSize: 40 },
  videoText: { color: colors.textMuted, fontSize: 15, marginTop: 6 },
  body: { color: '#D8D8D8', fontSize: 17, lineHeight: 25, marginTop: 12 },
  bullets: { marginTop: 14, gap: 8 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bulletDot: { width: 7, height: 7, borderRadius: 4, marginTop: 9 },
  bulletText: { flex: 1, color: colors.text, fontSize: 16, lineHeight: 23 },
});
