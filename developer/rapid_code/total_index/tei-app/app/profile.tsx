import { useState } from 'react';
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
import { BackArrow, Ellipsis } from '../src/components/Chrome';
import { useAuth } from '../src/auth';
import { useStore } from '../src/store';
import { colors } from '../src/theme';

/** ELEMENTAL Screen 8 — Edit Elemental Profile (white background per spec). */
export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useStore();
  const { profile, updateProfile, signOut } = useAuth();

  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    await signOut();
    // AuthGate sends us back to the launch screen once the session clears.
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
        <BackArrow onPress={() => router.replace('/home')} color="#F5B078" />

        <Text style={styles.rhinoWord}>RHINO ATHLETICS</Text>
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
        <Text style={styles.fieldNote}>
          Changing your email needs a confirmation link — not wired up yet.
        </Text>

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
            <Text style={{ fontSize: 18 }}>{showPassword ? '🙈' : '👁'}</Text>
          </Pressable>
        </View>

        <View style={{ marginTop: 8, paddingLeft: 8 }}>
          <Rule ok={password === '' || rules.length}>At least 8 characters</Rule>
          <Rule ok={password === '' || rules.number}>At least one number</Rule>
          <Rule ok={password === '' || rules.upper}>
            At least one upper case letter
          </Rule>
        </View>

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

        <Pressable
          onPress={() => router.push('/account-type')}
          accessibilityRole="button"
          style={styles.upgradeBtn}
        >
          <Text style={{ color: colors.orange, fontSize: 23 }}>Upgrade</Text>
        </Pressable>

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

function Rule({ ok, children }: { ok: boolean; children: string }) {
  return (
    <Text style={{ fontSize: 16, color: ok ? '#333' : '#B00', marginBottom: 2 }}>
      {'○ '}
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  rhinoWord: {
    color: '#5C5C5C',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginTop: 8,
  },
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
});
