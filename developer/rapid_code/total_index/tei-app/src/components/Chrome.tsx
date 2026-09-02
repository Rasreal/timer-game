import type { ReactNode } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, accentAlpha, useAccent } from '../theme';

const wordmark = require('../../assets/rhino-athletics-wordmark.png');

/** Box aspect ratio of the wordmark artwork (2555 x 250). */
const WORDMARK_RATIO = 2555 / 250;

/**
 * Ken's supplied RHINO ATHLETICS artwork, replacing the old hand-composed
 * "RHIN" + rhino.png + "ATHLETICS" lockup that rendered blurry on device.
 *
 * The PNG is a single-colour silhouette, so `tintColor` recolours it to
 * whatever grey the screen used before — the brand mark stays as recessive as
 * it was designed to be, on both the dark and the light screens.
 *
 * `height` drives the size and `width` follows the artwork's 10.22:1 box
 * ratio, so the mark can never distort.
 */
export function RhinoWordmark({
  height,
  color,
  align = 'flex-start',
  marginTop = 1,
}: {
  height: number;
  color: string;
  align?: 'flex-start' | 'flex-end';
  marginTop?: number;
}) {
  return (
    <Image
      source={wordmark}
      style={{
        width: height * WORDMARK_RATIO,
        height,
        alignSelf: align,
        marginTop,
      }}
      resizeMode="contain"
      tintColor={color}
      accessibilityRole="image"
      accessibilityLabel="RHINO ATHLETICS"
    />
  );
}

/** "Mission. Simple." over the RHINO ATHLETICS wordmark. */
export function BrandLockup({
  light = false,
  size = 34,
}: {
  light?: boolean;
  size?: number;
}) {
  return (
    <View>
      <Text
        style={{
          fontSize: size,
          fontWeight: '500',
          letterSpacing: -1,
          color: light ? '#111' : colors.text,
        }}
      >
        Mission. <Text style={{ color: colors.orange }}>Simple.</Text>
      </Text>
      {/* Ken asked for the wordmark to stay visually recessed but still meet
          the accessibility contrast minimum. At 18pt heavy it counts as large
          text, so the applicable threshold is 3.0:1 — #5F5F5F clears it at
          3.29:1 on black while staying well below the body copy in weight. */}
      <RhinoWordmark height={18} color={light ? '#6B6B6B' : '#5F5F5F'} />
    </View>
  );
}

/** The stacked TOTAL EFFECT INDEX / TEI lockup. */
export function TeiLockup({
  align = 'right',
  size = 'md',
  teiColor = colors.text,
}: {
  align?: 'left' | 'right';
  size?: 'sm' | 'md';
  teiColor?: string;
}) {
  const labelSize = size === 'sm' ? 13 : 19;
  const teiSize = size === 'sm' ? 30 : 46;
  return (
    <View style={{ alignItems: align === 'right' ? 'flex-end' : 'flex-start' }}>
      <Text
        style={{
          fontSize: labelSize,
          fontWeight: '700',
          letterSpacing: 0.4,
          color: '#9A9A9A',
        }}
      >
        TOTAL EFFECT INDEX
      </Text>
      <Text
        style={{
          fontSize: teiSize,
          fontWeight: '800',
          letterSpacing: -1,
          color: teiColor,
          marginTop: -2,
        }}
      >
        TEI
      </Text>
    </View>
  );
}

/** Back chevron used on almost every screen. */
export function BackArrow({
  onPress,
  color = colors.orange,
}: {
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={14}
      style={{ alignSelf: 'flex-start' }}
    >
      <Text style={{ color, fontSize: 34, lineHeight: 38, fontWeight: '300' }}>
        ‹
      </Text>
    </Pressable>
  );
}

/** The three-dot "more options" affordance. */
export function Ellipsis({
  onPress,
  color = '#777',
  size = 22,
  label,
}: {
  onPress: () => void;
  color?: string;
  size?: number;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={12}
    >
      <Text style={{ color, fontSize: size, letterSpacing: 2, lineHeight: size + 2 }}>
        •••
      </Text>
    </Pressable>
  );
}

/** Orange-outlined CTA. */
export function OutlineButton({
  title,
  onPress,
  disabled = false,
  style,
  fontSize = 17,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  fontSize?: number;
}) {
  const accent = useAccent();

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.outlineBtn,
        {
          borderColor: disabled ? '#4A4A4A' : accent,
          backgroundColor: pressed ? accentAlpha(accent, 0.16) : 'transparent',
        },
        style,
      ]}
    >
      <Text
        style={{
          color: disabled ? '#5A5A5A' : accent,
          fontSize,
          fontWeight: '600',
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

/** Dark pill CTA used on the orange variable-entry screens. */
export function DarkButton({
  title,
  onPress,
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.darkBtn,
        { opacity: pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <Text
        style={{
          color: disabled ? '#6B6B6B' : colors.orange,
          fontSize: 20,
          fontWeight: '600',
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1, backgroundColor: '#3A3A3A' }, style]} />;
}

export function Toast({ message }: { message: string }) {
  return (
    <View pointerEvents="none" style={styles.toastWrap}>
      <View style={styles.toast}>
        <Text style={styles.toastText}>{message}</Text>
      </View>
    </View>
  );
}

export function ScreenBody({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[{ flex: 1 }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  outlineBtn: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  darkBtn: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 26,
  },
  toastWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 46,
    alignItems: 'center',
    zIndex: 100,
  },
  toast: {
    backgroundColor: 'rgba(30,30,30,0.97)',
    borderColor: '#3A3A3A',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    maxWidth: 300,
  },
  toastText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
