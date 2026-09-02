import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackArrow, Ellipsis, RhinoWordmark } from '../src/components/Chrome';
import { EyeIcon } from '../src/components/Icons';
import { useAuth } from '../src/auth';
import { useStore } from '../src/store';
import {
  DEFAULT_ACCENT,
  SHOW_DEV_TOOLS,
  accentsForTier,
  colors,
  lightTint,
} from '../src/theme';
import type { TeiTheme } from '../src/lib/database.types';

/** ELEMENTAL Screen 8 — Edit Elemental Profile (white background per spec). */
export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useStore();
  const { profile, updateProfile, signOut } = useAuth();

  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');

  // Tier-specific attributes (Basic and Premium). Seeded by the same effect
  // as the names, so a deep-link/refresh does not lose them either.
  const [accent, setAccent] = useState(profile?.accent_color ?? DEFAULT_ACCENT);
  const [theme, setTheme] = useState<TeiTheme>(profile?.theme ?? 'dark');

  // Seed the fields once the profile arrives. useState only captures the
  // first render, and on a deep-link/refresh the profile is still loading
  // then, which previously left both name fields blank.
  const seeded = useRef(false);
  useEffect(() => {
    if (profile && !seeded.current) {
      seeded.current = true;
      setFirstName(profile.first_name);
      setLastName(profile.last_name);
      setAccent(profile.accent_color ?? DEFAULT_ACCENT);
      setTheme(profile.theme ?? 'dark');
    }
  }, [profile]);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tier = profile?.tier;
  // Elemental gets no attributes at all; Basic two swatches; Premium eleven
  // plus the Dark/Light theme row. See the client's Edit Profile mock-ups.
  const swatches = accentsForTier(tier);
  const isPremium = tier === 'premium';

  // The back arrow sits on this screen's WHITE background, where the accent
  // at full strength is too dark and saturated, so it takes the lighter tint
  // (the designer's #F5B078 for the default orange). It follows the swatch
  // being previewed rather than the saved one, so tapping a colour updates
  // the arrow immediately -- exactly as the swatches themselves do.
  const backTint = lightTint(accent);

  // Email changes require a confirmation round-trip, so it is read-only here.
  const email = profile?.email ?? '';

  const rules = {
    length: password.length >= 8,
    number: /\d/.test(password),
    upper: /[A-Z]/.test(password),
  };
  // Password is optional here — leaving it blank keeps the current one.
  const passwordOk =
    password === '' || (rules.length && rules.number && rules.upper);
  const canSave =
    passwordOk &&
    firstName.trim() !== '' &&
    lastName.trim() !== '' &&
    !busy;

  async function save() {
    if (!canSave) return;
    setBusy(true);
    setError(null);

    const message = await updateProfile({
      firstName,
      lastName,
      password: password === '' ? undefined : password,
      // Only send what this tier is actually allowed to set, so a Basic or
      // Elemental save can never write a value its screen never offered.
      accentColor: swatches.length ? accent : undefined,
      theme: isPremium ? theme : undefined,
    });

    setBusy(false);
    if (message) {
      setError(message);
      return;
    }

    showToast('Profile saved');
    router.replace('/home');
  }

  const tierLabel =
    profile?.tier === 'premium'
      ? 'Premium'
      : profile?.tier === 'basic'
        ? 'Basic'
        : 'Elemental';

  async function handleSignOut() {
    // AuthGate sends us back to the launch screen once the session clears;
    // if it never clears, say why rather than looking like a dead button.
    const message = await signOut();
    if (message) setError(`Could not sign out: ${message}`);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 14,
          paddingHorizontal: 24,
          paddingBottom: Math.max(insets.bottom, 20) + 30,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <BackArrow onPress={() => router.replace('/home')} color={backTint} />

        <RhinoWordmark height={16.5} color="#5C5C5C" marginTop={8} />
        <Text style={styles.missionSimple}>
          Mission. <Text style={{ color: colors.orange }}>Simple.</Text>
        </Text>

        <View style={styles.hr} />

        <Text style={styles.h1}>Edit Profile</Text>

        <Field
          label="Change First Name"
          value={firstName}
          onChange={setFirstName}
          placeholder="User Current First Name"
        />
        <Field
          label="Change Last Name"
          value={lastName}
          onChange={setLastName}
          placeholder="User Current Last Name"
        />
        <Text style={styles.label}>Email</Text>
        <View style={[styles.input, styles.inputReadonly]}>
          <Text style={{ fontSize: 17, color: '#555' }}>{email}</Text>
        </View>
        {SHOW_DEV_TOOLS && (
          <Text style={styles.fieldNote}>
            Changing your email needs a confirmation link — not wired up yet.
          </Text>
        )}

        <Text style={styles.label}>Change Password</Text>
        <View>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="**************"
            placeholderTextColor="#8A8A8A"
            autoCapitalize="none"
            selectionColor={colors.orange}
            style={[styles.input, { paddingRight: 50 }]}
          />
          <Pressable
            onPress={() => setShowPassword((s) => !s)}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            hitSlop={10}
            style={styles.eye}
          >
            <EyeIcon crossed={!showPassword} />
          </Pressable>
        </View>

        <View style={{ marginTop: 8, paddingLeft: 8 }}>
          <Rule ok={password === '' || rules.length}>At least 8 characters</Rule>
          <Rule ok={password === '' || rules.number}>At least one number</Rule>
          <Rule ok={password === '' || rules.upper}>
            At least one upper case letter
          </Rule>
        </View>

        {swatches.length > 0 && (
          <>
            <View
              style={[styles.hr, { marginTop: 20, marginHorizontal: 26 }]}
            />

            {isPremium && (
              <View style={styles.themeRow}>
                <Text style={styles.themeHeading}>Theme</Text>
                <ThemeCheckbox
                  label="Dark Mode"
                  selected={theme === 'dark'}
                  onPress={() => setTheme('dark')}
                />
                <ThemeCheckbox
                  label="Light Mode"
                  selected={theme === 'light'}
                  onPress={() => setTheme('light')}
                />
              </View>
            )}

            {/*
              Premium stacks the caption above a 6-wide grid; Basic runs the
              two chips down the left of a two-line caption, per the mock-ups.
            */}
            {isPremium ? (
              <>
                <Text style={styles.accentHeading}>
                  YOUR Preferred Accent Color for the App
                </Text>
                <View style={styles.swatchGrid}>
                  {swatches.map((s) => (
                    <Swatch
                      key={s.value}
                      color={s.value}
                      name={s.name}
                      selected={
                        accent.toLowerCase() === s.value.toLowerCase()
                      }
                      onPress={() => setAccent(s.value)}
                    />
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.accentRowBasic}>
                <View>
                  {swatches.map((s) => (
                    <Swatch
                      key={s.value}
                      color={s.value}
                      name={s.name}
                      size={30}
                      selected={
                        accent.toLowerCase() === s.value.toLowerCase()
                      }
                      onPress={() => setAccent(s.value)}
                    />
                  ))}
                </View>
                <Text style={[styles.accentHeading, styles.accentHeadingBasic]}>
                  YOUR Preferred Accent Color for the App
                </Text>
              </View>
            )}
          </>
        )}

        <View style={[styles.hr, { marginVertical: 20, marginHorizontal: 26 }]} />

        <View style={{ alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ellipsis
              onPress={() => router.push('/account-type')}
              color="#999"
              size={18}
              label="Change subscription"
            />
            <Text style={{ fontSize: 16, marginLeft: 8, color: '#111' }}>
              Current <Text style={{ fontWeight: '700' }}>TEI</Text> Subscription
            </Text>
          </View>
          <Text style={styles.subValue}>
            TEI <Text style={{ color: colors.orange }}>{tierLabel}</Text>
          </Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          onPress={save}
          disabled={!canSave}
          accessibilityRole="button"
          style={[styles.cta, { backgroundColor: canSave ? '#262626' : '#C8C8C8' }]}
        >
          <Text style={styles.ctaText}>
            {busy ? 'Saving…' : 'Save Changes'}{' '}
            {!busy && (
              <Text style={{ color: canSave ? colors.orange : '#EEE' }}>→</Text>
            )}
          </Text>
        </Pressable>

        {/* Premium is the top tier, so its mock-up has no Upgrade button. */}
        {!isPremium && (
          <Pressable
            onPress={() => router.push('/account-type')}
            accessibilityRole="button"
            style={styles.upgradeBtn}
          >
            <Text style={{ color: colors.orange, fontSize: 23 }}>Upgrade</Text>
          </Pressable>
        )}

        <Pressable
          onPress={handleSignOut}
          accessibilityRole="button"
          style={styles.signOutBtn}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'email-address';
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#8A8A8A"
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
        selectionColor={colors.orange}
        style={styles.input}
      />
    </>
  );
}

/**
 * One accent chip. The mock-ups mark the active colour with a big X drawn
 * over it rather than a border or tick, so that is what this draws — two
 * rotated bars in a darkened shade of the chip's own colour.
 */
function Swatch({
  color,
  name,
  selected,
  onPress,
  size = 52,
}: {
  color: string;
  name: string;
  selected: boolean;
  onPress: () => void;
  size?: number;
}) {
  const bar = {
    position: 'absolute' as const,
    width: size * 0.86,
    height: Math.max(3, size * 0.17),
    backgroundColor: 'rgba(0,0,0,0.42)',
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${name} accent colour${selected ? ', selected' : ''}`}
      style={[
        styles.swatch,
        { backgroundColor: color, width: size, height: size },
      ]}
    >
      {selected && (
        <>
          <View style={[bar, { transform: [{ rotate: '45deg' }] }]} />
          <View style={[bar, { transform: [{ rotate: '-45deg' }] }]} />
        </>
      )}
    </Pressable>
  );
}

/** Premium's Dark/Light theme choice — a square box with an X when picked. */
function ThemeCheckbox({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={styles.themeOption}
      hitSlop={6}
    >
      <View style={styles.themeBox}>
        {selected && <Text style={styles.themeBoxMark}>X</Text>}
      </View>
      <Text style={styles.themeLabel}>{label}</Text>
    </Pressable>
  );
}

function Rule({ ok, children }: { ok: boolean; children: string }) {
  return (
    <Text style={{ fontSize: 16, color: ok ? '#333' : '#B00', marginBottom: 2 }}>
      {'○ '}
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  missionSimple: {
    color: '#111',
    fontSize: 36,
    fontWeight: '500',
    letterSpacing: -1,
    marginTop: -2,
  },
  hr: { height: 1, backgroundColor: '#999', marginTop: 6, marginBottom: 2 },
  h1: { color: '#111', fontSize: 42, fontWeight: '400', letterSpacing: -1.2 },
  label: {
    color: '#111',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#E4E4E4',
    color: '#111',
    fontSize: 17,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  eye: { position: 'absolute', right: 12, top: 16 },
  subValue: {
    fontSize: 31,
    fontWeight: '800',
    color: '#111',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  cta: {
    marginTop: 18,
    paddingVertical: 19,
    paddingHorizontal: 36,
    alignSelf: 'flex-start',
  },
  ctaText: { color: '#fff', fontSize: 24 },
  upgradeBtn: {
    marginTop: 14,
    backgroundColor: '#0A0A0A',
    paddingVertical: 17,
    paddingHorizontal: 32,
    alignSelf: 'flex-start',
  },
  signOutBtn: { marginTop: 24, alignSelf: 'flex-start' },
  signOutText: {
    color: '#8A0000',
    fontSize: 17,
    textDecorationLine: 'underline',
  },
  inputReadonly: { backgroundColor: '#EFEFEF', justifyContent: 'center' },
  fieldNote: { color: '#777', fontSize: 12.5, marginTop: 6 },
  error: { color: '#B00020', fontSize: 14, lineHeight: 19, marginTop: 14 },

  /* --- tier attributes: theme + accent swatches --- */
  themeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  themeHeading: {
    color: '#111',
    fontSize: 27,
    fontWeight: '500',
    letterSpacing: -0.6,
    marginRight: 14,
  },
  themeOption: { flexDirection: 'row', alignItems: 'center', marginRight: 14 },
  themeBox: {
    width: 26,
    height: 26,
    backgroundColor: '#E4E4E4',
    borderWidth: 1,
    borderColor: '#B9B9B9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeBoxMark: { color: '#333', fontSize: 17, fontWeight: '600' },
  themeLabel: { color: '#111', fontSize: 17, marginLeft: 7 },
  accentHeading: {
    color: '#111',
    fontSize: 20,
    fontWeight: '500',
    marginTop: 14,
  },
  accentHeadingBasic: { flex: 1, marginTop: 0, marginLeft: 12, fontSize: 22 },
  accentRowBasic: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    // The mock-up's first chip is double-width; a plain wrapped grid of equal
    // chips reads the same and keeps the six-per-row rhythm.
    gap: 10,
  },
  swatch: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
});
