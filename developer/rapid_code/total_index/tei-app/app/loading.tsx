import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../src/theme';

const rhino = require('../assets/rhino.png');

/** Screen 12 — App Loading Screen. Animated orange divider, then Home. */
export default function Loading() {
  const router = useRouter();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
    );
    anim.start();

    const t = setTimeout(() => router.replace('/home'), 1800);
    return () => {
      anim.stop();
      clearTimeout(t);
    };
  }, [progress, router]);

  // Sweep the bar left-to-right, then right-to-left.
  const left = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0%', '50%', '100%'],
  });
  const width = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0%', '50%', '0%'],
  });

  return (
    <View style={styles.root}>
      <View style={{ backgroundColor: '#000', paddingTop: 140 }}>
        <Image
          source={rhino}
          style={styles.rhino}
          resizeMode="contain"
          accessibilityLabel="Rhino Athletics"
        />

        <View style={styles.track}>
          <Animated.View style={[styles.bar, { left, width }]} />
        </View>

        <Text style={styles.tei}>TEI</Text>
      </View>
      <View style={{ flex: 1, backgroundColor: '#2F2F2F' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  rhino: { width: '100%', height: 250 },
  track: { height: 2, backgroundColor: '#3A2A18', overflow: 'hidden' },
  bar: { position: 'absolute', top: 0, bottom: 0, backgroundColor: colors.orange },
  tei: {
    color: colors.text,
    fontSize: 58,
    fontWeight: '800',
    letterSpacing: -2,
    textAlign: 'right',
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 30,
  },
});
