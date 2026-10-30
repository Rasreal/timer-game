import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  type LayoutChangeEvent,
  type ScrollView,
} from 'react-native';

/**
 * Calculator keypad behaviour from Ken's 19 Oct 2026 edits: when a ring's
 * number field is tapped, the screen scrolls up so the session date, the
 * rings and the CTAs sit above the keypad; "Calculate TEI" scrolls back down
 * to reveal the big score.
 *
 * Attach `scrollRef` to the screen's ScrollView, `onAnchorLayout` to the block
 * that should land at the top (the session date), and add `bottomPadding` to
 * the content's bottom padding so there is room to scroll that far.
 * `topInset` is the status-bar height the anchor must clear.
 */
export function useKeyboardLift(topInset = 0) {
  const scrollRef = useRef<ScrollView>(null);
  const anchorY = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    // iOS reports "will" events in time to scroll alongside the keypad;
    // Android only has the "did" ones.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      // Wait a frame so the extra bottom padding exists before scrolling.
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({
          // Exactly at the anchor: any less and a strip of whatever sits above
          // it (the % of Target bar) shows under the status bar.
          y: Math.max(0, anchorY.current - topInset),
          animated: true,
        }),
      );
    });
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [topInset]);

  return {
    scrollRef,
    keyboardHeight,
    keyboardOpen: keyboardHeight > 0,
    // Room below the content for the keypad plus everything above the anchor,
    // so the anchor can reach the top even on a screen that otherwise fits.
    bottomPadding: keyboardHeight > 0 ? keyboardHeight + anchorY.current : 0,
    onAnchorLayout: (e: LayoutChangeEvent) => {
      anchorY.current = e.nativeEvent.layout.y;
    },
    /** Close the keypad and bring the top of the screen (the score) back. */
    collapse: () => {
      Keyboard.dismiss();
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    },
  };
}
