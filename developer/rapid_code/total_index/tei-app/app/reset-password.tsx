import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
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
import { BrandLockup, OutlineButton } from '../src/components/Chrome';
import { EyeIcon } from '../src/components/Icons';
import { useAuth } from '../src/auth';
import { supabase } from '../src/lib/supabase';
import { colors } from '../src/theme';

type RecoveryState = 'checking' | 'ready' | 'invalid';

/** Completes the password-recovery session created by Supabase's email link. */
export default function ResetPassword() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const url = Linking.useURL();
  const { completePasswordReset } = useAuth();
  const [recoveryState, setRecoveryState] = useState<RecoveryState>('checking');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let active = true;

    async function restoreRecoverySession() {
      const recoveryUrl = url ?? (await Linking.getInitialURL());
      if (!recoveryUrl) {
        if (active) {
          setRecoveryState('invalid');
          setLinkError('This password-reset link is missing or has expired.');
        }
        return;
      }

      const params = parseRecoveryParams(recoveryUrl);
      if (params.error) {
        if (active) {
          setRecoveryState('invalid');
          setLinkError(params.error);
        }
        return;
      }

      if (!params.code && !(params.accessToken && params.refreshToken)) {
        if (active) {
          setRecoveryState('invalid');
          setLinkError('This password-reset link is missing or has expired.');
        }
        return;
      }

      const result = params.code
        ? await supabase.auth.exchangeCodeForSession(params.code)
        : params.accessToken && params.refreshToken
          ? await supabase.auth.setSession({
              access_token: params.accessToken,
              refresh_token: params.refreshToken,
            })
          : { error: { message: 'This password-reset link is missing or has expired.' } };

      if (!active) return;
      if (result.error) {
        setRecoveryState('invalid');
        setLinkError('This password-reset link is invalid or has expired. Request a new link.');
        return;
      }
      setRecoveryState('ready');
    }

    void restoreRecoverySession();
    return () => {
      active = false;
    };
  }, [url]);

  const rules = {
    length: password.length >= 8,
    number: /\d/.test(password),
    upper: /[A-Z]/.test(password),
  };
  const passwordOk = rules.length && rules.number && rules.upper;
  const passwordsMatch = password === confirmPassword;
  const canSubmit = recoveryState === 'ready' && passwordOk && passwordsMatch && !busy;

  async function savePassword() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);

    const message = await completePasswordReset(password);
    setBusy(false);
    if (message) {
      setError(message);
      return;
    }
    setComplete(true);
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 16,
            paddingBottom: Math.max(insets.bottom, 20) + 20,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <BrandLockup />
        <View style={styles.body}>
          <Text style={styles.title}>Choose a new{`\n`}password</Text>

          {recoveryState === 'checking' && (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.orange} />
              <Text style={styles.description}>Checking your reset link…</Text>
            </View>
          )}

          {recoveryState === 'invalid' && (
            <>
              <Text style={styles.error}>{linkError}</Text>
              <OutlineButton
                title="REQUEST A NEW LINK"
                onPress={() => router.replace('/forgot-password' as never)}
                style={styles.cta}
              />
            </>
          )}

          {recoveryState === 'ready' && !complete && (
            <>
              <Text style={styles.description}>
                Use at least 8 characters, including one uppercase letter and one number.
              </Text>
              <PasswordField
                value={password}
                onChange={setPassword}
                visible={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
                placeholder="New password"
              />
              <PasswordField
                value={confirmPassword}
                onChange={setConfirmPassword}
                visible={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
                placeholder="Confirm new password"
                onSubmitEditing={savePassword}
              />
              <View style={styles.rules}>
                <Rule ok={rules.length}>At least 8 characters</Rule>
                <Rule ok={rules.number}>At least one number</Rule>
                <Rule ok={rules.upper}>At least one uppercase letter</Rule>
                {confirmPassword.length > 0 && (
                  <Rule ok={passwordsMatch}>Passwords match</Rule>
                )}
              </View>
              <OutlineButton
                title={busy ? 'SAVING…' : 'SAVE NEW PASSWORD'}
                onPress={savePassword}
                disabled={!canSubmit}
                fontSize={16}
                style={styles.cta}
              />
              {error && <Text style={styles.error}>{error}</Text>}
            </>
          )}

          {complete && (
            <>
              <Text style={styles.success}>Your password has been updated. Log in to continue.</Text>
              <OutlineButton
                title="GO TO LOG IN"
                onPress={() => router.replace('/login')}
                style={styles.cta}
              />
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PasswordField({
  value,
  onChange,
  visible,
  onToggle,
  placeholder,
  onSubmitEditing,
}: {
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  placeholder: string;
  onSubmitEditing?: () => void;
}) {
  return (
    <View style={styles.passwordField}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#8A8A8A"
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoComplete="new-password"
        onSubmitEditing={onSubmitEditing}
        selectionColor={colors.orange}
        style={styles.field}
      />
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        hitSlop={10}
        style={styles.eye}
      >
        <EyeIcon crossed={!visible} />
      </Pressable>
    </View>
  );
}

function Rule({ ok, children }: { ok: boolean; children: string }) {
  return <Text style={[styles.rule, { color: ok ? colors.success : '#A8A8A8' }]}>○ {children}</Text>;
}

/** Reads either Supabase's PKCE query parameter or implicit-flow hash tokens. */
export function parseRecoveryParams(url: string): {
  code: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
} {
  const query = url.split('?')[1]?.split('#')[0] ?? '';
  const fragment = url.split('#')[1] ?? '';
  const params = new URLSearchParams(`${query}&${fragment}`);
  const error = params.get('error_description') ?? params.get('error');

  return {
    code: params.get('code'),
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    // URLSearchParams has already percent-decoded this value. Decoding again
    // would throw for a legitimate error message containing a literal "%".
    error: error ? error.replace(/\+/g, ' ') : null,
  };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, paddingHorizontal: 22 },
  body: { flex: 1, justifyContent: 'center', paddingBottom: 42 },
  title: {
    color: colors.text,
    fontSize: 40,
    fontWeight: '500',
    letterSpacing: -1,
    lineHeight: 42,
  },
  description: { color: colors.textDim, fontSize: 16, lineHeight: 23, marginTop: 18, marginBottom: 22 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  passwordField: { position: 'relative', marginTop: 12 },
  field: {
    backgroundColor: '#2C2C2C',
    color: colors.text,
    fontSize: 17,
    paddingVertical: 18,
    paddingHorizontal: 16,
    paddingRight: 50,
  },
  eye: { position: 'absolute', right: 16, top: 17 },
  rules: { marginTop: 12 },
  rule: { fontSize: 14, marginBottom: 3 },
  cta: { alignSelf: 'flex-start', marginTop: 22, paddingHorizontal: 18 },
  success: { color: colors.success, fontSize: 16, lineHeight: 23, marginTop: 20 },
  error: { color: colors.red, fontSize: 14, lineHeight: 20, marginTop: 18 },
});
