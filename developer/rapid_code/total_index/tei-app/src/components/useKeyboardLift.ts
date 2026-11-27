import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  TextInput,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
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
 *
 * With the larger rings (Ken's 11 Nov 2026 edits) the date, rings and CTAs no
 * longer all fit above the keypad on every phone. Ken's keypad mockup keeps
 * the rings and CTAs in view and lets the date go off the top, so also attach
 * `onRingsLayout` to the rings and `belowLayout(name)` to each block under
 * the spacer (the CTA row, a label), and pass the spacer's `minHeight` as
 * `spacer`: the lift then scrolls further when it must to keep them clear.
 * The rings are measured rather than the CTA row itself because the spacer
 * shrinks as the keypad padding arrives, moving the CTAs mid-scroll.
 *
 * The ring being typed into always wins: where five rings (Breakdown) leave
 * no room for both, the CTAs give way rather than push the focused number
 * off the top. Attach `onScroll` to the ScrollView and `onFieldFocus` as the
 * rings' `onFocus` (focus bubbles up from the ring's text field): the field's
 * focus can reach JS after the keyboard event, so the screen is placed once
 * it lands, or after FOCUS_WAIT ms with only the CTAs to go by.
 */
/** Room kept between the CTAs and the top of the keypad. */
const KEEP_GAP = 12;
/** Room kept above the focused number, for the top of its ring. */
const FIELD_ROOM = 40;
/** How long the keypad's scroll waits for the field's focus to arrive. */
const FOCUS_WAIT = 150;

type Measurable = {
  measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void;
};

export function useKeyboardLift(topInset = 0, { spacer = 0 }: { spacer?: number } = {}) {
  const scrollRef = useRef<ScrollView>(null);
  const anchorY = useRef(0);
  const ringsBottom = useRef(0);
  const below = useRef<Record<string, number>>({});
  const scrollY = useRef(0);
  // Where the keypad wants the screen (its top edge and the CTA-driven
  // scroll), kept while it is open so a focus change can re-place it.
  const target = useRef<{ y: number; keypadTop: number } | null>(null);
  // Set from the keyboard event until the screen has been placed.
  const pending = useRef(false);
  const fallback = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scroll = (to: number) => scrollRef.current?.scrollTo({ y: to, animated: true });

  /** Scroll for the focused field, or report false when none is focused. */
  const placeForField = (): boolean => {
    const goal = target.current;
    const field = TextInput.State.currentlyFocusedInput() as Measurable | null;
    if (!goal || !field?.measureInWindow) return false;
    field.measureInWindow((_x, windowY, _w, h) => {
      const top = windowY + scrollY.current;
      // Never past the point where the number slips under the status bar,
      // and always far enough that it clears the keypad.
      const highest = top - topInset - FIELD_ROOM;
      const lowest = top + h + KEEP_GAP - goal.keypadTop;
      scroll(Math.max(0, lowest, Math.min(goal.y, highest)));
    });
    return true;
  };
  const placeRef = useRef(placeForField);
  placeRef.current = placeForField;

  useEffect(() => {
    // iOS reports "will" events in time to scroll alongside the keypad;
    // Android only has the "did" ones.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      // Exactly at the anchor: any less and a strip of whatever sits above it
      // (the % of Target bar) shows under the status bar.
      const keypadTop = e.endCoordinates.screenY;
      let y = Math.max(0, anchorY.current - topInset);
      if (ringsBottom.current > 0) {
        // The CTAs' bottom edge with the spacer at its minimum, plus a little
        // room, must sit above the keypad's top edge.
        const blocks = Object.values(below.current).reduce((sum, h) => sum + h, 0);
        const keepBottom = ringsBottom.current + spacer + blocks + KEEP_GAP;
        y = Math.max(y, keepBottom - keypadTop);
      }
      const reopened = target.current !== null;
      target.current = { y, keypadTop };
      // iOS can repeat the event while the keypad is up; the screen is
      // already placed then.
      if (reopened && !pending.current) return;
      pending.current = true;
      // Wait a frame so the extra bottom padding exists before scrolling.
      requestAnimationFrame(() => {
        if (!pending.current) return;
        if (placeRef.current()) {
          pending.current = false;
          return;
        }
        if (fallback.current) clearTimeout(fallback.current);
        fallback.current = setTimeout(() => {
          fallback.current = null;
          if (!pending.current) return;
          pending.current = false;
          if (!placeRef.current()) scroll(target.current?.y ?? y);
        }, FOCUS_WAIT);
      });
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      target.current = null;
      pending.current = false;
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
      if (fallback.current) clearTimeout(fallback.current);
    };
  }, [topInset, spacer]);

  return {
    scrollRef,
    keyboardHeight,
    keyboardOpen: keyboardHeight > 0,
    // Room below the content for the keypad plus everything above the anchor,
    // so the anchor can reach the top even on a screen that otherwise fits.
    bottomPadding: keyboardHeight > 0 ? keyboardHeight + anchorY.current : 0,
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.current = e.nativeEvent.contentOffset.y;
    },
    /** A ring's field took focus: place the screen for it. */
    onFieldFocus: () => {
      if (!target.current) return;
      if (placeRef.current()) {
        pending.current = false;
        if (fallback.current) clearTimeout(fallback.current);
        fallback.current = null;
      }
    },
    onAnchorLayout: (e: LayoutChangeEvent) => {
      anchorY.current = e.nativeEvent.layout.y;
    },
    onRingsLayout: (e: LayoutChangeEvent) => {
      ringsBottom.current = e.nativeEvent.layout.y + e.nativeEvent.layout.height;
    },
    belowLayout: (name: string) => (e: LayoutChangeEvent) => {
      below.current[name] = e.nativeEvent.layout.height;
    },
    /** Close the keypad and bring the top of the screen (the score) back. */
    collapse: () => {
      Keyboard.dismiss();
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    },
  };
}
