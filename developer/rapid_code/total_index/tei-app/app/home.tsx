import { useCallback, useState, type ReactNode } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
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
import { latestSession } from '../src/lib/sessions';
import type { SessionRow } from '../src/lib/database.types';
import { useStore } from '../src/store';
import { colors } from '../src/theme';

/**
 * ELEMENTAL Screen 1 — TEI Elemental Home Screen.
 *
 * Review unlocks on Basic and Plan TEI on Premium; both surface an upgrade
 * prompt at lower tiers.
 */
export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useStore();
  const { profile, profileError, reloadProfile } = useAuth();

  const fullName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim() || profile.email
    : '';

  // Saving and reviewing history is a paid-tier feature.
  const reviewLocked = profile?.tier === 'elemental' || !profile;
  // Planning is Premium-only, matching the plans table's RLS policy.
  const planLocked = profile?.tier !== 'premium';

  // Elemental is calculate-only by design, so there is no history to show it;
  // the same gate the Review tile uses decides whether to fetch at all.
  const canSaveHistory = profile != null && profile.tier !== 'elemental';
  const [latest, setLatest] = useState<SessionRow | null>(null);
  // A failed read must not read as "no sessions yet", so it replaces the
  // score line the same way profileError replaces the name.
  const [latestError, setLatestError] = useState<string | null>(null);

  // Re-read on every focus, not just on mount: expo-router keeps Home mounted
  // while the calculator is pushed over it, so a plain useEffect left the score
  // showing whatever it was before the session was logged.
  useFocusEffect(
    useCallback(() => {
      if (!canSaveHistory) {
        setLatest(null);
        setLatestError(null);
        return;
      }
      let cancelled = false;
      void latestSession().then(({ data, error }) => {
        if (cancelled) return;
        setLatest(data);
        setLatestError(error);
      });
      return () => {
        cancelled = true;
      };
    }, [canSaveHistory]),
  );

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
        {profileError ? (
          <Pressable onPress={reloadProfile} accessibilityRole="button">
            <Text style={styles.loadError}>{profileError}</Text>
          </Pressable>
        ) : (
          <Text style={styles.name}>{fullName}</Text>
        )}
        <Text style={styles.ready}>Ready to train</Text>

        {canSaveHistory &&
          (latestError ? (
            <Text style={styles.loadError}>
              Could not load your last session: {latestError}
            </Text>
          ) : (
            <View style={styles.scoreRow}>
              <Text style={styles.scoreValue}>
                {latest ? formatTei(latest.tei) : '0'}
              </Text>
              <Text style={styles.scoreCaption}>
                {latest ? 'Last session TEI' : 'No sessions yet'}
              </Text>
            </View>
          ))}
      </View>

      <View style={styles.grid}>
        <Tile
          title={'Calculate\nSession'}
          icon={<CalcIcon color="#000" />}
          onPress={() =>
            // Premium picks a session type first; the other tiers only have
            // the Standard Strength model, so they go straight to it.
            router.push(
              profile?.tier === 'premium' ? '/session-type' : '/calculator',
            )
          }
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
          icon={<DumbbellIcon color={planLocked ? '#4E4E4E' : '#000'} />}
          locked={planLocked}
          onPress={() =>
            planLocked
              ? showToast('Plan TEI is available on TEI Premium.')
              : router.push('/plan')
          }
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

/** Whole numbers stay whole; anything else keeps a single decimal. */
function formatTei(value: number): string {
  const n = Number(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
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
  loadError: { color: colors.red, fontSize: 14, lineHeight: 19 },
  ready: { color: colors.text, fontSize: 22, fontWeight: '500' },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 6 },
  scoreValue: {
    color: colors.orange,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
  },
  scoreCaption: { color: '#9C9C9C', fontSize: 15, marginLeft: 8 },
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
