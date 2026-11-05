import { Fragment } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { OutlineButton } from '../../src/components/Chrome';
import { PopupCard, PopupScrim, popupText } from '../../src/components/PopupCard';
import { helpTopic } from '../../src/lib/helpContent';
import { colors, useAccent } from '../../src/theme';

/**
 * One "Information Button Pop Up" behind a Home tile's ellipsis option (Ken's
 * 30 Oct 2026 edits): a card over the Home screen, presented as a transparent
 * modal (see app/_layout.tsx). The copy lives in src/lib/helpContent.ts;
 * video topics show a placeholder until Ken supplies the videos.
 */
export default function InfoPage() {
  const router = useRouter();
  const accent = useAccent();
  const { topic: id } = useLocalSearchParams<{ topic?: string }>();
  const topic = helpTopic(id);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  return (
    <PopupScrim onClose={close}>
      <PopupCard title={topic?.title ?? 'Help'} onClose={close}>
        {!topic ? (
          <Text style={popupText.body}>This page could not be found.</Text>
        ) : (
          <>
            {topic.video && (
              <View style={[styles.video, { borderColor: accent }]}>
                <Text style={[styles.play, { color: accent }]}>▶</Text>
                <Text style={styles.videoText}>Video coming soon</Text>
              </View>
            )}

            {topic.paragraphs.map((p) => (
              <Paragraph key={p} text={p} />
            ))}

            {topic.sections?.map((section) => (
              <Fragment key={section.heading}>
                <Text style={popupText.heading}>{section.heading}</Text>
                <Text style={[popupText.body, popupText.bold, { marginTop: 4 }]}>
                  {section.lead}
                </Text>
                <Text style={[popupText.body, { marginTop: 2 }]}>{section.body}</Text>
              </Fragment>
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
                onPress={() => router.replace(topic.cta!.route as never)}
                style={{ marginTop: 22 }}
              />
            )}
          </>
        )}
      </PopupCard>
    </PopupScrim>
  );
}

/** A paragraph whose **bold** spans are rendered bold, as in Ken's boxes. */
function Paragraph({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/);
  return (
    <Text style={popupText.body}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Text key={i} style={popupText.bold}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  video: {
    height: 150,
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
    marginTop: 14,
  },
  play: { fontSize: 36 },
  videoText: { color: colors.textMuted, fontSize: 15, marginTop: 6 },
  bullets: { marginTop: 14, gap: 8 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bulletDot: { width: 7, height: 7, borderRadius: 4, marginTop: 9 },
  bulletText: { flex: 1, color: colors.text, fontSize: 16, lineHeight: 23 },
});
