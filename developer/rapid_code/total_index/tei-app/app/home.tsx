import type { ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandLockup, TeiLockup } from '../src/components/Chrome';
import {
  CalcIcon,
  DumbbellIcon,
  ListIcon,
  LockIcon,
  PersonIcon,
  fillParent,
} from '../src/components/Icons';
import { useAuth } from '../src/auth';
import { useStore } from '../src/store';
import { colors } from '../src/theme';

/**
 * ELEMENTAL Screen 1 — TEI Elemental Home Screen.
 *
 * Review and Plan TEI are locked at the Elemental tier; per the brief they are
 * dummy buttons that surface an upgrade prompt.
 */
export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useStore();
  const { profile } = useAuth();

  const fullName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim() || profile.email
    : '';

  // Saving and reviewing history is a paid-tier feature.
  const reviewLocked = profile?.tier === 'elemental' || !profile;

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + 12,
          paddingBottom: Math.max(insets.bottom, 16) + 10,
        },
      ]}
    >
      <BrandLockup />

      <View style={{ marginTop: 18 }}>
        <TeiLockup align="right" />
      </View>

      <View style={{ marginTop: 10, marginBottom: 16 }}>
        <Text style={styles.name}>{fullName}</Text>
        <Text style={styles.ready}>Ready to train</Text>
      </View>

      <View style={styles.grid}>
        <Tile
          title={'Calculate\nSession'}
          icon={<CalcIcon color="#000" />}
          onPress={() => router.push('/calculator')}
        />
        <Tile
          title="Review"
          icon={<ListIcon color={reviewLocked ? '#4E4E4E' : '#000'} />}
          locked={reviewLocked}
          onPress={() =>
            reviewLocked
              ? showToast('Review is available on TEI Basic and Premium.')
              : router.push('/review')
          }
        />
        <Tile
          title={'Plan\nTEI'}
          icon={<DumbbellIcon color="#4E4E4E" />}
          locked
          onPress={() => showToast('Plan TEI is available on TEI Premium.')}
        />
        <Tile
          title="Profile"
          icon={<PersonIcon color="#000" />}
          onPress={() => router.push('/profile')}
        />
      </View>

      <Pressable
        onPress={() => router.push('/account-type')}
        accessibilityRole="button"
        style={{ alignSelf: 'center', marginTop: 16 }}
      >
        <Text style={styles.upgrade}>Upgrade</Text>
      </Pressable>
    </View>
  );
}

function Tile({
  title,
  icon,
  locked = false,
  onPress,
}: {
  title: string;
  icon: ReactNode;
  locked?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title.replace('\n', ' ')}
      style={({ pressed }) => [
        styles.tile,
        locked ? styles.tileLocked : styles.tileActive,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={[styles.tileTitle, { color: locked ? '#4E4E4E' : '#000' }]}>
        {title}
      </Text>

      {/* Decorative only: the whole tile is already the tap target, so this
          must not be a nested pressable (invalid button-in-button on web). */}
      <Text
        style={[styles.tileEllipsis, { color: locked ? '#4E4E4E' : '#000' }]}
        pointerEvents="none"
      >
        •••
      </Text>

      {locked && (
        <View style={styles.lockWrap} pointerEvents="none">
          <LockIcon />
        </View>
      )}

      <View style={{ flex: 1 }} />
      <View style={{ opacity: locked ? 0.4 : 1 }}>{icon}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20 },
  name: { color: '#9C9C9C', fontSize: 20 },
  ready: { color: colors.text, fontSize: 22, fontWeight: '500' },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tile: {
    width: '49%',
    height: '48.5%',
    padding: 14,
    marginBottom: '3%',
  },
  tileActive: { backgroundColor: colors.orange },
  tileLocked: {
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#333',
  },
  tileTitle: {
    fontSize: 24,
    fontWeight: '500',
    letterSpacing: -0.4,
    lineHeight: 27,
    paddingRight: 26,
  },
  tileEllipsis: {
    position: 'absolute',
    top: 8,
    right: 12,
    fontSize: 22,
    letterSpacing: 2,
  },
  lockWrap: {
    ...fillParent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgrade: {
    color: colors.text,
    fontSize: 18,
    textDecorationLine: 'underline',
  },
});
