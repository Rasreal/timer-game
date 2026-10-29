import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackArrow, OutlineButton } from '../src/components/Chrome';
import { QUIZ, QUIZ_RESULTS, quizResult } from '../src/lib/quiz';
import { TRAINING_REASONS } from '../src/lib/training';
import { colors, useAccent } from '../src/theme';

/** "What kind of athlete are you?" — Profile ellipsis option. */
export default function AthleteQuiz() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const accent = useAccent();
  const [answers, setAnswers] = useState<(number | null)[]>(() => QUIZ.map(() => null));
  const [done, setDone] = useState(false);

  const complete = answers.every((a) => a !== null);
  const result = done ? quizResult(answers as number[]) : null;
  const reason = result === null ? null : TRAINING_REASONS[result];

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
      <Text style={styles.title}>What kind of athlete are you?</Text>

      {result === null || !reason ? (
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
          <Text style={styles.youAre}>You are a</Text>
          <Text style={[styles.resultName, { color: accent }]}>{QUIZ_RESULTS[result].name}</Text>
          <View style={[styles.reason, { backgroundColor: reason.color }]}>
            <Text style={styles.reasonText}>{reason.label}</Text>
            <Text style={styles.reasonRange}>
              TEI {reason.from}–{reason.to} per session
            </Text>
          </View>
          <Text style={styles.advice}>{QUIZ_RESULTS[result].advice}</Text>

          <OutlineButton
            title="How to interpret your score"
            onPress={() => router.push('/training-scale' as never)}
            style={{ marginTop: 24 }}
          />
          <OutlineButton
            title="Take the quiz again"
            onPress={() => {
              setAnswers(QUIZ.map(() => null));
              setDone(false);
            }}
            style={{ marginTop: 12 }}
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
  block: { marginTop: 22 },
  question: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
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
  youAre: { color: colors.textMuted, fontSize: 18 },
  resultName: { fontSize: 36, fontWeight: '800', letterSpacing: -0.8, marginTop: 2 },
  reason: { borderRadius: 10, padding: 14, marginTop: 16 },
  reasonText: { color: '#1C1C1C', fontSize: 18, fontWeight: '800' },
  reasonRange: { color: '#1C1C1C', fontSize: 14, marginTop: 2 },
  advice: { color: '#D8D8D8', fontSize: 17, lineHeight: 25, marginTop: 16 },
});
