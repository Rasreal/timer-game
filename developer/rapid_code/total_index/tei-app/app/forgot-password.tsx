import { useState } from 'react';
import * as Linking from 'expo-linking';
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
import { BrandLockup, OutlineButton } from '../src/components/Chrome';
import { useAuth } from '../src/auth';
import { colors } from '../src/theme';

/** Starts Supabase's email-based password-recovery flow. */
export default function ForgotPassword() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const canSubmit = email.trim().includes('@') && !busy;

  async function sendResetLink() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);

    // This produces the app-scheme URL in a native build and the current web
    // origin in a browser. Both need to be in Supabase's Redirect URL allowlist.
    const message = await requestPasswordReset(
      email,
      Linking.createURL('reset-password'),
    );

    setBusy(false);
    if (message) {
      setError(message);
      return;
    }
    setSent(true);
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
          <Text style={styles.title}>Reset{`\n`}password</Text>
          <Text style={styles.description}>
            Enter the email address for your TEI account and we’ll send you a
            secure password-reset link.
          </Text>

          <TextInput
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setSent(false);
            }}
            placeholder="Email"
            placeholderTextColor="#8A8A8A"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            editable={!busy}
            onSubmitEditing={sendResetLink}
            selectionColor={colors.orange}
            style={styles.field}
          />

          <OutlineButton
            title={busy ? 'SENDING…' : 'SEND RESET LINK'}
            onPress={sendResetLink}
            disabled={!canSubmit}
            fontSize={16}
            style={styles.cta}
          />

          {sent && (
            <Text style={styles.success}>
              If an account matches that email, a reset link is on its way.
              Check your inbox and spam folder.
            </Text>
          )}
          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            onPress={() => router.replace('/login')}
            accessibilityRole="button"
            style={styles.back}
          >
            <Text style={styles.backText}>← Back to log in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
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
  description: {
    color: colors.textDim,
    fontSize: 16,
    lineHeight: 23,
    marginTop: 18,
    marginBottom: 26,
    maxWidth: 340,
  },
  field: {
    backgroundColor: '#2C2C2C',
    color: colors.text,
    fontSize: 17,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  cta: { alignSelf: 'flex-start', marginTop: 12, paddingHorizontal: 18 },
  success: { color: colors.success, fontSize: 14, lineHeight: 20, marginTop: 18 },
  error: { color: colors.red, fontSize: 14, lineHeight: 20, marginTop: 18 },
  back: { alignSelf: 'flex-start', marginTop: 28 },
  backText: { color: '#A8A8A8', fontSize: 15 },
});
