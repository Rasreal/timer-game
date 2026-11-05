import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { InfoPopup } from '../src/components/PopupCard';
import { TrainingScale } from '../src/components/TrainingScale';
import { accentAlpha, useAccent } from '../src/theme';
import type { TrainingBand } from '../src/lib/training';

/** Title, switch row and column headings above the 32 TEI rows. */
const CHROME_HEIGHT = 118;

/**
 * "How to interpret your session score" — Ken's "Understanding YOUR
 * Training" graphics (30 Oct 2026): the Per Session chart, with a switch to
 * the detailed Week & Month version. Like his graphic it is a white page,
 * and its rows are sized so the whole chart fits on one screen.
 */
export default function TrainingScaleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const accent = useAccent();
  const { height } = useWindowDimensions();
  const [detailed, setDetailed] = useState(false);
  const [info, setInfo] = useState<TrainingBand['info'] | null>(null);

  const available = height - insets.top - insets.bottom - CHROME_HEIGHT;
  const step = Math.max(16, Math.min(24, available / 32));

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Dark clock and battery on the white page, as long as it is open. */}
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: Math.max(insets.bottom, 12),
        }}
      >
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
            Understanding YOUR Training
          </Text>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={14}
          >
            <Text style={[styles.close, { color: accent }]}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.toggleRow}>
          <Pressable onPress={() => setDetailed(false)} accessibilityRole="button" hitSlop={8}>
            <Text style={[styles.toggleText, { color: accent }]}>Per Session</Text>
          </Pressable>
          <Pressable onPress={() => setDetailed(true)} accessibilityRole="button" hitSlop={8}>
            <Text
              style={[styles.toggleText, styles.toggleSmall, { color: detailed ? accent : accentAlpha(accent, 0.45) }]}
            >
              Week &amp; Month
            </Text>
          </Pressable>
          <Switch
            value={detailed}
            onValueChange={setDetailed}
            accessibilityLabel="Show Week and Month"
            trackColor={{ false: '#D9D9D9', true: '#34C759' }}
            ios_backgroundColor="#D9D9D9"
            style={{ transform: [{ scale: 0.8 }] }}
          />
        </View>

        <TrainingScale detailed={detailed} step={step} onInfo={(band) => setInfo(band.info)} />
      </ScrollView>

      <InfoPopup info={info} onClose={() => setInfo(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    gap: 10,
  },
  title: { flex: 1, color: '#757575', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  close: { fontSize: 24, fontWeight: '400' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginTop: 4,
    marginBottom: 10,
  },
  toggleText: { fontSize: 19, fontWeight: '600' },
  toggleSmall: { fontSize: 16 },
});
