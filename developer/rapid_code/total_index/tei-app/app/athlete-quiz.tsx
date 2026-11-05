import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackArrow, OutlineButton } from '../src/components/Chrome';
import {
  QUIZ,
  QUIZ_DISCLAIMER,
  QUIZ_MAX,
  QUIZ_SUBTITLE,
  QUIZ_TITLE,
  athleteIdentity,
  quizScore,
} from '../src/lib/quiz';
import { colors, useAccent } from '../src/theme';

/** "What Kind of Athlete Are You?" — Profile ellipsis option (Ken, 30 Oct 2026). */
export default function AthleteQuiz() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const accent = useAccent();
  const [answers, setAnswers] = useState<(number | null)[]>(() => QUIZ.map(() => null));
  const [done, setDone] = useState(false);

  const complete = answers.every((a) => a !== null);
  const score = done ? quizScore(answers as number[]) : null;
  const identity = score === null ? null : athleteIdentity(score);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + 6,
        paddingHorizontal: 22,
        paddingBottom: Math.max(insets.bottom, 16) + 20,
      }}
    >
      <BackArrow onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
      <Text style={styles.title}>{QUIZ_TITLE}</Text>
      <Text style={styles.subtitle}>{QUIZ_SUBTITLE}</Text>

      {score === null || !identity ? (
        <>
          {QUIZ.map((q, qi) => (
            <View key={q.question} style={styles.block}>
              <Text style={styles.question}>
                {qi + 1}. {q.question}
              </Text>
              {q.answers.map((answer, ai) => {
                const on = answers[qi] === ai;
                return (
                  <Pressable
                    key={answer}
                    onPress={() =>
                      setAnswers((current) => current.map((a, i) => (i === qi ? ai : a)))
                    }
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={answer}
                    style={[styles.answer, on && { borderColor: accent }]}
                  >
                    <View style={[styles.radio, on && { borderColor: accent }]}>
                      {on && <View style={[styles.radioDot, { backgroundColor: accent }]} />}
                    </View>
                    <Text style={styles.answerText}>{answer}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <OutlineButton
            title="See My Result"
            disabled={!complete}
            onPress={() => setDone(true)}
            style={{ marginTop: 24 }}
          />
        </>
      ) : (
        <View style={styles.block}>
          {/* Ken's result card: kicker, identity, summary, reflection score */}
          <View style={[styles.result, { borderColor: accent }]}>
            <Text style={[styles.kicker, { color: accent }]}>Your ATHLETE IDENTITY</Text>
            <Text style={styles.identity}>{identity.name}</Text>
            <Text style={styles.summary}>{identity.summary}</Text>
            <Text style={styles.reflection}>
              Reflection score: {score}/{QUIZ_MAX}. {QUIZ_DISCLAIMER}
            </Text>
          </View>

          <OutlineButton
            title="Take the quiz again"
            onPress={() => {
              setAnswers(QUIZ.map(() => null));
              setDone(false);
            }}
            style={{ marginTop: 24 }}
          />
        </View>
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
  },
  subtitle: { color: colors.textMuted, fontSize: 16, fontStyle: 'italic', marginTop: 6 },
  block: { marginTop: 22 },
  question: { color: colors.text, fontSize: 18, fontWeight: '700', lineHeight: 24, marginBottom: 8 },
  answer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginTop: 8,
  },
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
  answerText: { flex: 1, color: '#E2E2E2', fontSize: 16, lineHeight: 21 },
  result: { borderWidth: 1.5, borderRadius: 12, padding: 18, backgroundColor: '#141414' },
  kicker: { fontSize: 13, fontWeight: '800', letterSpacing: 0.6 },
  identity: { color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.6, marginTop: 4 },
  summary: { color: colors.text, fontSize: 17, fontWeight: '700', lineHeight: 24, marginTop: 10 },
  reflection: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 12 },
});
