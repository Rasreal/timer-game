import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../auth';

/**
 * The first-time "thought bubble" tour (Ken's 11 Nov 2026 edits): the first
 * time someone opens a screen, yellow bubbles point at its features one at a
 * time. Tapping the bubble (or anywhere) moves to the next one, "Skip tour"
 * ends it, and Profile > "Replay app tour" shows every tour again.
 *
 * Which tours a person has seen is stored on the device per account, so a
 * second account on the same phone still gets its own tour.
 */

export type TourStep = {
  /** The name a screen gives the element with `tour.target(name)`. */
  target: string;
  /** The tip. Words between ** and ** show in bold. */
  text: string;
  /**
   * Where across the element the pointer aims, 0 (left edge) to 1 (right
   * edge). 0.25 aims at the left one of two side-by-side items, such as the
   * first ring or Calculate TEI beside SAVE. Defaults to the middle.
   */
  pointAt?: number;
};

const PREFIX = 'tei.tour.v1';
const keyFor = (user: string, screen: string) => `${PREFIX}:${user}:${screen}`;

/** Lets the screen settle (and fonts and data land) before the first bubble. */
const START_DELAY = 700;
const GAP = 10;
const SIDE = 16;
const MAX_WIDTH = 270;

/**
 * Tests render screens directly, and a bubble over them would swallow taps.
 * jest.setup.js sets this flag; the Tour tests clear it.
 */
function toursDisabled(): boolean {
  return (globalThis as { __TEI_DISABLE_TOURS__?: boolean }).__TEI_DISABLE_TOURS__ === true;
}

function useTourUser(): string {
  // Some screen tests mock useAuth with a partial object (or none at all), so
  // read it defensively. useAuth itself always calls useContext, so the hook
  // order is the same on every render either way.
  let auth: { session?: { user?: { id?: string } } | null } | undefined;
  try {
    auth = useAuth();
  } catch {
    auth = undefined;
  }
  return auth?.session?.user?.id ?? 'guest';
}

/** Forget which tours this account has seen, so each shows again. */
export async function resetTours(userId: string | null | undefined): Promise<void> {
  const mine = `${PREFIX}:${userId ?? 'guest'}:`;
  const keys = await AsyncStorage.getAllKeys();
  await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith(mine)));
}

/** The tip split into plain and bold runs, from its **bold** markers. */
export function tipRuns(text: string): { text: string; bold: boolean }[] {
  return text
    .split('**')
    .map((part, i) => ({ text: part, bold: i % 2 === 1 }))
    .filter((run) => run.text !== '');
}

/** The tip as read aloud, without its bold markers. */
export const plainTip = (text: string) => text.split('**').join('');

type Rect = { x: number; y: number; width: number; height: number };
type Measurable = {
  measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void;
};

/**
 * Runs a screen's tour. Attach `target(name)` as the `ref` of each element a
 * step points at (a plain View with collapsable={false} works best) and
 * render `overlay` anywhere in the screen.
 *
 * Pass `ready: false` while the screen is still loading, so the tour waits
 * for the elements it points at. A step whose element is missing or off the
 * screen is skipped.
 */
export function useTour(
  screen: string,
  steps: TourStep[],
  { ready = true }: { ready?: boolean } = {},
): { target: (name: string) => (node: unknown) => void; overlay: ReactNode } {
  const user = useTourUser();
  const key = keyFor(user, screen);
  const nodes = useRef(new Map<string, Measurable | null>());
  const refs = useRef(new Map<string, (node: unknown) => void>());
  const [index, setIndex] = useState<number | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  const target = useCallback((name: string) => {
    let ref = refs.current.get(name);
    if (!ref) {
      ref = (node: unknown) => {
        nodes.current.set(name, node as Measurable | null);
      };
      refs.current.set(name, ref);
    }
    return ref;
  }, []);

  // Start once per account and screen, after the screen is ready. Checked on
  // every focus, so "Replay app tour" in Profile takes effect on the way back.
  useFocusEffect(
    useCallback(() => {
      if (toursDisabled() || !ready) return;
      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      void AsyncStorage.getItem(key)
        .then((seen) => {
          if (cancelled || seen) return;
          // Already showing (focus came back mid-tour): leave it where it is.
          timer = setTimeout(() => setIndex((i) => (i === null ? 0 : i)), START_DELAY);
        })
        .catch(() => {});
      return () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
      };
    }, [key, ready]),
  );

  const finish = useCallback(() => {
    setIndex(null);
    setRect(null);
    void AsyncStorage.setItem(key, '1').catch(() => {});
  }, [key]);

  // Find where the current step's element is on screen.
  useEffect(() => {
    if (index === null) return;
    const step = stepsRef.current[index];
    if (!step) {
      finish();
      return;
    }
    const node = nodes.current.get(step.target);
    if (!node?.measureInWindow) {
      setIndex(index + 1);
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      if (width === 0 && height === 0) setIndex(index + 1);
      else setRect({ x, y, width, height });
    });
  }, [index, finish]);

  const next = useCallback(() => {
    setRect(null);
    setIndex((i) => (i === null ? null : i + 1));
  }, []);

  const step = index !== null ? steps[index] : undefined;
  const overlay =
    step && rect ? (
      <TourBubble
        text={step.text}
        rect={rect}
        pointAt={step.pointAt ?? 0.5}
        position={index! + 1}
        total={steps.length}
        onNext={next}
        onSkip={finish}
        onOffscreen={next}
      />
    ) : null;

  return { target, overlay };
}

function TourBubble({
  text,
  rect,
  pointAt,
  position,
  total,
  onNext,
  onSkip,
  onOffscreen,
}: {
  text: string;
  rect: Rect;
  pointAt: number;
  position: number;
  total: number;
  onNext: () => void;
  onSkip: () => void;
  onOffscreen: () => void;
}) {
  // The overlay's own size, so the bubble is placed in the same coordinates
  // measureInWindow used (edge to edge on Android, with the status bar).
  const [frame, setFrame] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!frame) return;
    // Below the fold (a long screen on a small phone): skip rather than
    // point at nothing.
    if (rect.y >= frame.height || rect.y + rect.height <= 0) onOffscreen();
  }, [frame, rect, onOffscreen]);

  let bubble: ReactNode = null;
  if (frame) {
    const width = Math.min(MAX_WIDTH, frame.width - SIDE * 2);
    const centerX = rect.x + rect.width * pointAt;
    const left = Math.min(Math.max(centerX - width / 2, SIDE), frame.width - SIDE - width);
    const tailLeft = Math.min(Math.max(centerX - left - 7, 12), width - 26);
    // Bubble under the element in the top half of the screen, over it lower down.
    const below = rect.y + rect.height / 2 < frame.height * 0.55;
    const place = below
      ? { top: rect.y + rect.height + GAP }
      : { bottom: frame.height - rect.y + GAP };

    bubble = (
      <View
        style={[styles.bubbleWrap, { left, width }, place]}
        pointerEvents="box-none"
        testID="tour-bubble-wrap"
      >
        {below && <View style={[styles.tail, { left: tailLeft }]} />}
        {/* The tip and Skip are separate buttons, so VoiceOver and TalkBack
            reach both; a tap anywhere else falls through to the backdrop,
            which also moves on. */}
        <View style={styles.bubble}>
          <Pressable
            onPress={onNext}
            accessibilityRole="button"
            accessibilityLabel={`${plainTip(text)} Tip ${position} of ${total}.`}
            accessibilityHint="Shows the next tip"
            testID="tour-bubble"
            style={styles.textRow}
          >
            <Text style={styles.text}>
              {tipRuns(text).map((run, i) =>
                run.bold ? (
                  <Text key={i} style={styles.bold}>
                    {run.text}
                  </Text>
                ) : (
                  run.text
                ),
              )}
            </Text>
            <Text style={styles.close}>✕</Text>
          </Pressable>
          {total > 1 && (
            <View style={styles.footer} pointerEvents="box-none">
              <Text style={styles.count} accessibilityElementsHidden importantForAccessibility="no">
                {position} of {total}
              </Text>
              {position < total && (
                <Pressable
                  onPress={onSkip}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Skip tour"
                  testID="tour-skip"
                >
                  <Text style={styles.skip}>Skip tour</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
        {!below && <View style={[styles.tail, { left: tailLeft }]} />}
      </View>
    );
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      // Android back ends the tour, the same as Skip.
      onRequestClose={onSkip}
      statusBarTranslucent
      navigationBarTranslucent={Platform.OS === 'android'}
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onNext}
        onLayout={(e) => setFrame(e.nativeEvent.layout)}
        accessible={false}
        testID="tour-backdrop"
      >
        {bubble}
      </Pressable>
    </Modal>
  );
}

const YELLOW = '#FFD60A';

const styles = StyleSheet.create({
  bubbleWrap: { position: 'absolute' },
  bubble: {
    backgroundColor: YELLOW,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  textRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  text: { flex: 1, color: '#1A1A1A', fontSize: 16, lineHeight: 21 },
  bold: { fontWeight: '700' },
  close: { color: '#5A4A00', fontSize: 13, marginTop: 1 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  count: { color: '#5A4A00', fontSize: 12 },
  skip: {
    color: '#1A1A1A',
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  // A small square turned 45° makes the pointer under or over the bubble.
  tail: {
    width: 14,
    height: 14,
    backgroundColor: YELLOW,
    transform: [{ rotate: '45deg' }],
    marginVertical: -7,
    zIndex: -1,
  },
});
