import { StyleSheet, View } from 'react-native';

/**
 * The tile glyphs are drawn with plain Views rather than an SVG dependency —
 * they are simple enough geometrically and keep the prototype dependency-light.
 */

export function CalcIcon({ color }: { color: string }) {
  return (
    <View style={[s.calcBody, { borderColor: color }]}>
      <View style={[s.calcScreen, { borderColor: color }]} />
      <View style={s.calcRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[s.dot, { backgroundColor: color }]} />
        ))}
      </View>
      <View style={s.calcRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[s.dot, { backgroundColor: color }]} />
        ))}
      </View>
    </View>
  );
}

export function ListIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 44, height: 40, justifyContent: 'space-between' }}>
      {[0, 1].map((r) => (
        <View key={r} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[s.listBox, { borderColor: color }]} />
          <View style={{ marginLeft: 6, justifyContent: 'space-between', height: 14 }}>
            <View style={[s.listLine, { backgroundColor: color, width: 26 }]} />
            <View style={[s.listLine, { backgroundColor: color, width: 18 }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function DumbbellIcon({ color }: { color: string }) {
  return (
    <View style={s.dumbbell}>
      <View style={[s.plateOuter, { borderColor: color }]} />
      <View style={[s.plateInner, { borderColor: color }]} />
      <View style={[s.bar, { backgroundColor: color }]} />
      <View style={[s.plateInner, { borderColor: color }]} />
      <View style={[s.plateOuter, { borderColor: color }]} />
    </View>
  );
}

export function PersonIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 44, height: 44, alignItems: 'center' }}>
      <View style={[s.head, { borderColor: color }]} />
      <View style={[s.shoulders, { borderColor: color }]} />
    </View>
  );
}

/** Absolute-fill without relying on `StyleSheet.absoluteFillObject` typings. */
export const fillParent = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
} as const;

export function LockIcon({ color = '#3A3A3A' }: { color?: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={[s.shackle, { borderColor: color }]} />
      <View style={[s.lockBody, { backgroundColor: color }]}>
        <View style={s.keyhole} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  calcBody: {
    width: 40,
    height: 46,
    borderWidth: 1.8,
    borderRadius: 4,
    padding: 4,
    justifyContent: 'space-between',
  },
  calcScreen: { height: 9, borderWidth: 1.5, borderRadius: 1 },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dot: { width: 4.5, height: 4.5, borderRadius: 3 },

  listBox: { width: 14, height: 14, borderWidth: 1.8, borderRadius: 2 },
  listLine: { height: 1.8, borderRadius: 1 },

  dumbbell: { flexDirection: 'row', alignItems: 'center', height: 44 },
  plateOuter: { width: 8, height: 22, borderWidth: 1.8, borderRadius: 2 },
  plateInner: { width: 6, height: 13, borderWidth: 1.8, borderRadius: 1 },
  bar: { width: 14, height: 3.5 },

  head: { width: 17, height: 17, borderRadius: 9, borderWidth: 1.8, marginTop: 5 },
  shoulders: {
    width: 32,
    height: 18,
    borderWidth: 1.8,
    borderBottomWidth: 0,
    borderTopLeftRadius: 17,
    borderTopRightRadius: 17,
    marginTop: 3,
  },

  shackle: {
    width: 30,
    height: 22,
    borderWidth: 7,
    borderBottomWidth: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginBottom: -2,
  },
  lockBody: {
    width: 48,
    height: 38,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyhole: {
    width: 7,
    height: 12,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
});
