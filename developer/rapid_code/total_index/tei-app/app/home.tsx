import { useCallback, useState, type ReactNode } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OptionsSheet, type SheetOption } from '../src/components/OptionsSheet';
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
import { SESSION_TARGET, displayTei } from '../src/lib/tei';
import type { SessionRow } from '../src/lib/database.types';
import { useStore } from '../src/store';
import { colors, useAccent } from '../src/theme';

type Menu = 'calculate' | 'review' | 'plan' | 'profile';

/**
 * The "HELP" options behind each tile's ellipsis (Ken's 19 and 22 Oct 2026
 * edits). Ken specified Calculate, Review and Profile; the Plan options are
 * drafted in the same style for him to approve.
 */
const MENUS: Record<
  Menu,
  { title: string; selectLabel: string; options: (SheetOption & { route: string })[] }
> = {
  calculate: {
    title: 'How can we help you CALCULATE?',
    selectLabel: 'Select this CALCULATE Option',
    options: [
      { key: 'video', label: 'How to use TEI Standard Strength Calculator video.', route: '/info/calculator-video' },
      { key: 'periods', label: 'Per session, per week or per month.', route: '/info/periods' },
      { key: 'exertion', label: 'How important is “Perceived Exertion”?', route: '/info/exertion' },
    ],
  },
  review: {
    title: 'What would you like to REVIEW?',
    selectLabel: 'Select this REVIEW Option',
    options: [
      { key: 'snapshot', label: 'SNAPSHOT of previous full week.', route: '/review-snapshot' },
      { key: 'detailed', label: 'A detailed look at a Week or Month.', route: '/review' },
      { key: 'interpret', label: 'How to interpret your TEI score.', route: '/training-scale' },
      { key: 'video', label: 'How to use REVIEW video.', route: '/info/review-video' },
    ],
  },
  plan: {
    title: 'How can we help you PLAN?',
    selectLabel: 'Select this PLAN Option',
    options: [
      { key: 'video', label: 'How to use PLAN video.', route: '/info/plan-video' },
      { key: 'plan-review', label: 'How Plan and Review work together.', route: '/info/plan-review' },
      { key: 'target', label: 'Setting your weekly Target.', route: '/info/plan-target' },
    ],
  },
  profile: {
    title: 'How can we help with your PROFILE?',
    selectLabel: 'Select this PROFILE Option',
    options: [
      { key: 'video', label: 'How to use TEI Profile video.', route: '/info/profile-video' },
      { key: 'quiz', label: 'What kind of athlete are you?', route: '/athlete-quiz' },
      { key: 'compare', label: 'Why we do not compare to other participants (yet).', route: '/info/compare' },
      { key: 'upgrade', label: 'Benefits of Upgrading.', route: '/info/upgrade' },
    ],
  },
};

/**
 * Home — one layout for every tier (Ken's 19 Oct 2026 edits offered the Basic
 * Home Screen for both): the stacked TEI lockup beside a large grey Last TEI
 * number, the member's first name, and the four tiles.
 *
 * Review unlocks on Basic and Plan TEI on Premium; both surface an upgrade
 * prompt at lower tiers, and a locked tile's ellipsis stays inert.
 */
export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast, resetSession } = useStore();
  const { profile, profileError, reloadProfile } = useAuth();
  const [menu, setMenu] = useState<Menu | null>(null);

  const firstName = profile ? profile.first_name.trim() || profile.email : '';

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

  const lastPercent = latest ? Math.round((Number(latest.tei) / SESSION_TARGET) * 100) : null;

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
      <View style={styles.headRow}>
        <View>
          <Text style={styles.lockupWord}>TOTAL</Text>
          <Text style={styles.lockupWord}>EFFECT</Text>
          <Text style={styles.lockupWord}>INDEX</Text>
          <Text style={styles.lockupTei}>TEI</Text>
        </View>
        <Text
          style={styles.bigNumber}
          accessibilityLabel={latest ? `Last TEI ${displayTei(Number(latest.tei))}` : 'Last TEI 0'}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {/* Whole numbers, like the calendar and the calculators' score. */}
          {latest ? displayTei(Number(latest.tei)) : '0'}
        </Text>
      </View>

      <View style={styles.nameRow}>
        <View style={{ flexShrink: 1 }}>
          {profileError ? (
            <Pressable onPress={reloadProfile} accessibilityRole="button">
              <Text style={styles.loadError}>{profileError}</Text>
            </Pressable>
          ) : (
            <Text style={styles.name}>{firstName}</Text>
          )}
          <Text style={styles.ready}>Ready to train</Text>
        </View>

        {canSaveHistory ? (
          latestError ? (
            <Text style={[styles.loadError, styles.lastLine]}>
              Could not load your last session: {latestError}
            </Text>
          ) : (
            <Text style={styles.lastLine}>
              {latest ? (
                <>
                  Last TEI -{' '}
                  <Text style={styles.lastPercent}>{lastPercent}%</Text> of Target
                </>
              ) : (
                'No sessions yet'
              )}
            </Text>
          )
        ) : (
          profile && (
            <Pressable
              onPress={() => router.push('/account-type')}
              accessibilityRole="button"
              accessibilityLabel="Last TEI is on TEI Basic. See plans."
            >
              <Text style={styles.lastLine}>
                Last TEI - <Text style={styles.lastPercent}>with TEI Basic</Text>
              </Text>
            </Pressable>
          )
        )}
      </View>

      <View style={styles.grid}>
        <Tile
          title={'Calculate\nSession'}
          icon={<CalcIcon color="#000" />}
          onPress={() => {
            // Every Calculate Session is a new session: a blank draft stamped
            // now. Keeping the last one's values invited saving a duplicate
            // (Ken's "walked the dog twice" day), and a session opened from
            // Review must not carry its edit mode into a new calculation.
            resetSession();
            // Premium picks a session type first; the other tiers only have
            // the Standard Strength model, so they go straight to it.
            router.push(
              profile?.tier === 'premium' ? '/session-type' : '/calculator',
            );
          }}
          onMenu={() => setMenu('calculate')}
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
          onMenu={() => setMenu('review')}
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
          onMenu={() => setMenu('plan')}
        />
        <Tile
          title="Profile"
          icon={<PersonIcon color="#000" />}
          onPress={() => router.push('/profile')}
          onMenu={() => setMenu('profile')}
        />
      </View>

      <Pressable
        onPress={() => router.push('/account-type')}
        accessibilityRole="button"
        style={{ alignSelf: 'center', marginTop: 16 }}
      >
        <Text style={styles.upgrade}>
          {reviewLocked ? 'Upgrade' : 'Change Subscription'}
        </Text>
      </Pressable>

      <OptionsSheet
        visible={menu !== null}
        title={menu ? MENUS[menu].title : ''}
        selectLabel={menu ? MENUS[menu].selectLabel : ''}
        options={menu ? MENUS[menu].options : []}
        onClose={() => setMenu(null)}
        onSelect={(key) => {
          const option = menu ? MENUS[menu].options.find((o) => o.key === key) : undefined;
          setMenu(null);
          if (option) router.push(option.route as never);
        }}
      />
    </View>
  );
}

function Tile({
  title,
  icon,
  locked = false,
  onPress,
  onMenu,
}: {
  title: string;
  icon: ReactNode;
  locked?: boolean;
  onPress: () => void;
  /** Opens the tile's HELP options; ignored while the tile is locked. */
  onMenu: () => void;
}) {
  const accent = useAccent();
  const name = title.replace('\n', ' ');

  return (
    // The ellipsis is a sibling of the tile's Pressable, not nested in it, so
    // the two stay separate tap targets (and valid buttons on web).
    <View style={styles.tile}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={name}
        style={({ pressed }) => [
          styles.tileBody,
          locked ? styles.tileLocked : { backgroundColor: accent },
          { opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={[styles.tileTitle, { color: locked ? '#4E4E4E' : '#000' }]}>
          {title}
        </Text>

        {locked && (
          <View style={styles.lockWrap} pointerEvents="none">
            <LockIcon />
          </View>
        )}

        <View style={{ flex: 1 }} />
        <View style={{ opacity: locked ? 0.4 : 1 }}>{icon}</View>
      </Pressable>

      {locked ? (
        <Text
          style={[styles.tileEllipsis, { color: '#4E4E4E' }]}
          pointerEvents="none"
        >
          •••
        </Text>
      ) : (
        <Pressable
          onPress={onMenu}
          accessibilityRole="button"
          accessibilityLabel={`${name} options`}
          hitSlop={12}
          style={styles.tileEllipsisBtn}
        >
          <Text style={[styles.tileEllipsisText, { color: '#000' }]}>•••</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20 },
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  lockupWord: {
    color: '#9A9A9A',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.2,
    lineHeight: 23,
  },
  lockupTei: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 37,
  },
  bigNumber: {
    flex: 1,
    textAlign: 'right',
    color: '#3A3A3A',
    fontSize: 150,
    fontWeight: '800',
    letterSpacing: -6,
    lineHeight: 140,
    paddingRight: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 16,
    gap: 10,
  },
  lastLine: { color: '#6E6E6E', fontSize: 14, textAlign: 'right' },
  lastPercent: { color: '#B5B5B5', fontWeight: '700' },
  name: { color: '#9C9C9C', fontSize: 20 },
  loadError: { color: colors.red, fontSize: 14, lineHeight: 19 },
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
    marginBottom: '3%',
  },
  tileBody: { flex: 1, padding: 14 },
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
  tileEllipsisBtn: { position: 'absolute', top: 4, right: 6, paddingHorizontal: 6 },
  tileEllipsisText: { fontSize: 22, letterSpacing: 2 },
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
