import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../theme';
import { Ellipsis } from './Chrome';

/**
 * The circular variable inputs used across every calculator screen.
 *
 *   - `variant="grid"`  the four flat rings on the calculator screen
 *   - `variant="hero"`  the large bevelled ring on each orange entry screen
 */
export function Ring({
  value,
  label,
  onEllipsis,
  variant = 'grid',
  onChange,
  overRange = false,
}: {
  value: number | null;
  label: string;
  onEllipsis?: () => void;
  variant?: 'grid' | 'hero';
  onChange?: (v: number | null) => void;
  overRange?: boolean;
}) {
  const hero = variant === 'hero';
  const size = hero ? 236 : 132;
  const numberSize = hero ? 74 : 44;

  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: 'center',
            justifyContent: 'center',
          },
          hero ? styles.heroOuter : styles.gridOuter,
        ]}
      >
        {/* Inner well on the hero ring */}
        {hero && <View style={styles.heroWell} />}

        {/* Red over-range gradient from the top of the circle */}
        {overRange && (
          <View
            style={[
              styles.overRangeClip,
              hero
                ? { top: 26, left: 26, right: 26, bottom: 26, borderRadius: (size - 52) / 2 }
                : { top: -11, left: -11, right: -11, bottom: -11, borderRadius: size / 2 + 11 },
            ]}
            pointerEvents="none"
          >
            <LinearGradient
              colors={['rgba(255,34,34,0.85)', 'rgba(255,34,34,0.25)', 'rgba(255,34,34,0)']}
              locations={[0, 0.18, 0.32]}
              style={StyleSheet.absoluteFill}
            />
          </View>
        )}

        <View style={{ alignItems: 'center', marginTop: hero ? -10 : -4 }}>
          {onChange ? (
            <TextInput
              value={value === null ? '' : String(value)}
              onChangeText={(raw) => {
                const digits = raw.replace(/[^0-9]/g, '');
                onChange(digits === '' ? null : Number(digits));
              }}
              keyboardType="number-pad"
              placeholder="- -"
              placeholderTextColor="#5A5A5A"
              accessibilityLabel={label}
              selectionColor={colors.orange}
              style={{
                width: hero ? 168 : 104,
                height: numberSize + 12,
                textAlign: 'center',
                textAlignVertical: 'center',
                color: colors.text,
                fontSize: numberSize,
                lineHeight: numberSize + 10,
                fontWeight: '700',
                letterSpacing: -2,
                padding: 0,
              }}
            />
          ) : (
            <Text
              style={{
                height: numberSize + 12,
                fontSize: numberSize,
                lineHeight: numberSize + 10,
                textAlign: 'center',
                fontWeight: '700',
                letterSpacing: value === null ? 0 : -2,
                color: value === null ? '#5A5A5A' : colors.text,
              }}
            >
              {value === null ? '- -' : String(value)}
            </Text>
          )}
          <Text
            style={{
              fontSize: hero ? 25 : 14,
              color: '#D8D8D8',
              marginTop: hero ? 0 : -1,
            }}
          >
            {label}
          </Text>
        </View>
      </View>

      {onEllipsis && (
        <View style={{ marginTop: 4 }}>
          <Ellipsis onPress={onEllipsis} label={`More about ${label}`} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  gridOuter: {
    borderWidth: 11,
    borderColor: colors.ring,
  },
  heroOuter: {
    backgroundColor: '#242424',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  heroWell: {
    position: 'absolute',
    top: 26,
    left: 26,
    right: 26,
    bottom: 26,
    borderRadius: 999,
    backgroundColor: '#17100A',
  },
  overRangeClip: {
    position: 'absolute',
    overflow: 'hidden',
  },
});
