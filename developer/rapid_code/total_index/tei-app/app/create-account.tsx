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
import { EyeIcon } from '../src/components/Icons';
import { useAuth } from '../src/auth';
import { useStore } from '../src/store';
import { colors } from '../src/theme';

/** Screen 7 — Create TEI Elemental Account (white background per spec). */
export default function CreateAccount() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pendingTier, showToast } = useStore();
  const { signUp } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rules = {
    length: password.length >= 8,
    number: /\d/.test(password),
    upper: /[A-Z]/.test(password),
  };
  const passwordOk = rules.length && rules.number && rules.upper;
  const fieldsOk =
    firstName.trim() !== '' && lastName.trim() !== '' && email.includes('@');
  const canSubmit = fieldsOk && passwordOk && accepted && !busy;

  const tierLabel =
    pendingTier === 'elemental'
      ? 'Elemental'
      : pendingTier === 'basic'
        ? 'Basic'
        : 'Premium';

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);

    const { error: message, needsEmailConfirmation } = await signUp({
      firstName,
      lastName,
      email,
      password,
      tier: pendingTier,
    });

    if (message) {
      // signUp() already maps Supabase's wording to user-facing copy.
      setBusy(false);
      setError(message);
      return;
    }

    if (needsEmailConfirmation) {
      // The project requires email confirmation, so there is no session yet.
      setBusy(false);
      showToast('Check your email to confirm your account, then log in.');
      router.replace('/login');
      return;
    }

    router.replace('/loading');
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
        <BackArrow onPress={() => router.back()} color="#F5B078" />

        <Text style={styles.rhinoWord}>RHINO ATHLETICS</Text>
        <Text style={styles.missionSimple}>
          Mission. <Text style={{ color: colors.orange }}>Simple.</Text>
        </Text>

        <View style={styles.hr} />

        <Text style={styles.h1}>Create Account</Text>

        <View style={styles.acctTypeRow}>
          <Ellipsis
            onPress={() => router.replace('/account-type')}
            color="#999"
            size={18}
            label="Change account type"
          />
          <Text style={styles.acctTypeLabel}>Account Type Selected</Text>
        </View>
        <Text style={styles.acctTypeValue}>
          TEI <Text style={{ color: colors.orange }}>{tierLabel}</Text>
        </Text>

        <Field label="First Name" value={firstName} onChange={setFirstName} required />
        <Field label="Last Name" value={lastName} onChange={setLastName} required />
        <Field
          label="Email"
          value={email}
          onChange={setEmail}
          required
          keyboardType="email-address"
        />

        <Text style={styles.label}>
          Password <Text style={{ color: '#111' }}>*</Text>
        </Text>
        <View>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
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
          <Rule ok={rules.length}>At least 8 characters</Rule>
          <Rule ok={rules.number}>At least one number</Rule>
          <Rule ok={rules.upper}>At least one upper case letter</Rule>
        </View>

        <View style={[styles.hr, { marginVertical: 18, marginHorizontal: 20 }]} />

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable
            onPress={() => passwordOk && setAccepted((a) => !a)}
            disabled={!passwordOk}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: accepted, disabled: !passwordOk }}
            accessibilityLabel="Accept terms and conditions"
            style={[
              styles.checkbox,
              {
                backgroundColor: !passwordOk
                  ? '#E0E0E0'
                  : accepted
                    ? colors.orange
                    : '#fff',
                borderWidth: accepted ? 0 : 2,
              },
            ]}
          >
            {accepted && (
              <Text style={{ color: '#fff', fontSize: 20, lineHeight: 24 }}>✓</Text>
            )}
          </Pressable>
          <Text style={{ fontSize: 18, marginLeft: 14, color: '#111' }}>
            I accept{' '}
            <Text
              style={{ textDecorationLine: 'underline' }}
              onPress={() =>
                showToast('Terms & Conditions are placeholder copy.')
              }
            >
              Terms and Conditions
            </Text>
            *
          </Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          onPress={submit}
          disabled={!canSubmit}
          accessibilityRole="button"
          style={[
            styles.cta,
            { backgroundColor: canSubmit ? '#262626' : '#C8C8C8' },
          ]}
        >
          <Text style={styles.ctaText}>
            {busy ? 'Creating…' : 'Create Account'}{' '}
            {!busy && (
              <Text style={{ color: canSubmit ? colors.orange : '#EEE' }}>→</Text>
            )}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  keyboardType?: 'email-address';
}) {
  return (
    <>
      <Text style={styles.label}>
        {label} {required && <Text style={{ color: '#111' }}>*</Text>}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
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
    <Text style={{ fontSize: 16, color: ok ? colors.success : '#333', marginBottom: 2 }}>
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
  hr: { height: 1, backgroundColor: '#999', marginTop: 8, marginBottom: 4 },
  h1: { color: '#111', fontSize: 42, fontWeight: '400', letterSpacing: -1.2 },
  acctTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  acctTypeLabel: { fontSize: 15, color: '#3A3A3A', marginLeft: 8 },
  acctTypeValue: {
    fontSize: 29,
    fontWeight: '800',
    color: '#111',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  label: {
    color: '#111',
    fontSize: 20,
    fontWeight: '500',
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
  checkbox: {
    width: 34,
    height: 34,
    borderColor: '#BBB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cta: {
    marginTop: 20,
    paddingVertical: 18,
    paddingHorizontal: 30,
    alignSelf: 'flex-start',
  },
  ctaText: { color: '#fff', fontSize: 23 },
  error: {
    color: '#B00020',
    fontSize: 14,
    lineHeight: 19,
    marginTop: 14,
  },
});
