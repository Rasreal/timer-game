import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  ScrollView,
  TextInput,
  View,
  type KeyboardEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from 'react-native';

/**
 * Ken's 11 Nov 2026 edits: on Sign In / Create Account the keypad covered the
 * field being typed into. The screens used KeyboardAvoidingView, which only
 * padded the screen on iOS (and did nothing on Android, where edge-to-edge
 * stops the window from resizing) and never scrolled the focused field into
 * view.
 *
 * These helpers work from the keyboard's own events on both platforms, so
 * they need no native module.
 */

const SHOW = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const HIDE = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

/**
 * How much of the screen the keyboard covers, measured from its top edge to
 * the bottom of the screen. On Android (edge to edge) the reported height
 * leaves out the navigation bar under the keyboard, which left the bottom of
 * the Premium waitlist's SEND button hidden.
 */
export function coveredHeight(e: KeyboardEvent): number {
  const { height, screenY } = e.endCoordinates;
  const fromTop = Dimensions.get('screen').height - screenY;
  // A floating or undocked keyboard can report a top edge far from the bottom.
  return fromTop > height && fromTop < height * 1.5 ? fromTop : height;
}

/** Height of the on-screen keyboard, 0 while it is closed. */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener(SHOW, (e) => setHeight(coveredHeight(e)));
    const hide = Keyboard.addListener(HIDE, () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

/** Room left between the focused field and the top of the keyboard. */
const GAP = 24;

type Props = ScrollViewProps & {
  /** Extra space to keep under the focused field, e.g. for its rule list. */
  extraGap?: number;
};

/**
 * A ScrollView that keeps the focused text field above the keyboard: it
 * adds the keyboard's height as bottom padding (so there is room to scroll)
 * and scrolls the field into view when the keyboard opens or focus moves to
 * another field. Use it in place of KeyboardAvoidingView + ScrollView.
 */
export const KeyboardAwareScrollView = forwardRef<ScrollView, Props>(function KeyboardAwareScrollView(
  { children, contentContainerStyle, onScroll, extraGap = 0, ...rest },
  ref,
) {
  const scrollRef = useRef<ScrollView>(null);
  useImperativeHandle(ref, () => scrollRef.current as ScrollView);
  const scrollY = useRef(0);
  const keyboardTop = useRef<number | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const reveal = useCallback(() => {
    const top = keyboardTop.current;
    const input = TextInput.State.currentlyFocusedInput() as
      | { measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void }
      | null;
    if (top === null || !input?.measureInWindow) return;
    input.measureInWindow((_x, y, _w, h) => {
      const overlap = y + h + GAP + extraGap - top;
      if (overlap > 0) {
        scrollRef.current?.scrollTo({ y: scrollY.current + overlap, animated: true });
      }
    });
  }, [extraGap]);

  useEffect(() => {
    const show = Keyboard.addListener(SHOW, (e: KeyboardEvent) => {
      keyboardTop.current = e.endCoordinates.screenY;
      setKeyboardHeight(coveredHeight(e));
      // Wait for the extra bottom padding to be laid out before scrolling.
      setTimeout(reveal, Platform.OS === 'ios' ? 60 : 120);
    });
    const hide = Keyboard.addListener(HIDE, () => {
      keyboardTop.current = null;
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [reveal]);

  return (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      {...rest}
      onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
        scrollY.current = e.nativeEvent.contentOffset.y;
        onScroll?.(e);
      }}
      contentContainerStyle={[contentContainerStyle, keyboardHeight > 0 && { paddingBottom: keyboardHeight + GAP }]}
    >
      {/* Text-field focus bubbles, so moving between fields while the
          keyboard stays open (no new keyboard event on Android) still
          scrolls the next field into view. */}
      <View style={{ flexGrow: 1 }} onFocus={() => setTimeout(reveal, 50)}>
        {children}
      </View>
    </ScrollView>
  );
});
