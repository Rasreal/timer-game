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
import { BrandLockup, Divider, OutlineButton } from '../src/components/Chrome';
import { useAuth } from '../src/auth';
import { useStore } from '../src/store';
import { colors } from '../src/theme';

/** Screen 4 — Onboarding / Log In. */
export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useStore();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canLogIn = email.trim().length > 3 && password.length >= 8 && !busy;

  async function logIn() {
    if (!canLogIn) return;
    setBusy(true);
    setError(null);

    const message = await signIn(email, password);

    if (message) {
      setBusy(false);
      setError(
        message.toLowerCase().includes('invalid login')
          ? 'That email and password combination is not recognised.'
          : message,
      );
      return;
    }

    // AuthGate redirects to /home once the session lands; show the branded
    // loading screen while that happens.
    router.replace('/loading');
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 16,
          paddingHorizontal: 22,
          paddingBottom: Math.max(insets.bottom, 20) + 20,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <BrandLockup />

        <View style={{ marginTop: 48 }}>
          <Text style={styles.stacked}>TOTAL</Text>
          <Text style={styles.stacked}>EFFECT</Text>
          <Text style={styles.stacked}>INDEX</Text>
          <Text style={styles.teiBig}>TEI</Text>
        </View>

        <View style={{ flex: 1, minHeight: 30 }} />

        <Text style={styles.welcome}>Welcome</Text>
        <Text style={[styles.welcome, { color: colors.orange, marginBottom: 18 }]}>
          Log In
        </Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#8A8A8A"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          selectionColor={colors.orange}
          style={styles.field}
        />

        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="#8A8A8A"
            secureTextEntry
            autoCapitalize="none"
            onSubmitEditing={logIn}
            selectionColor={colors.orange}
            style={[styles.field, { flex: 1 }]}
          />
          <OutlineButton
            title={busy ? '…' : 'LOG IN'}
            onPress={logIn}
            disabled={!canLogIn}
            fontSize={17}
            style={{ borderRadius: 0, justifyContent: 'center', paddingHorizontal: 20 }}
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Divider style={{ marginTop: 22, marginBottom: 16 }} />

        <Pressable
          onPress={() => router.push('/account-type')}
          accessibilityRole="button"
        >
          <Text style={styles.createAccount}>
            Create account <Text style={{ color: colors.orange }}>↗</Text>
          </Text>
        </Pressable>

        {!error && !canLogIn && (email.length > 0 || password.length > 0) && (
          <Text style={styles.hint}>
            Enter an email and a password of at least 8 characters.
          </Text>
        )}

        <Pressable
          onPress={() =>
            showToast('Password reset is out of scope for the prototype.')
          }
          accessibilityRole="button"
          style={{ alignSelf: 'flex-start', marginTop: 14 }}
        >
          <Text style={{ color: '#666', fontSize: 13 }}>Forgot password?</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  stacked: {
    color: '#9A9A9A',
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 44,
  },
  teiBig: {
    color: colors.text,
    fontSize: 58,
    fontWeight: '800',
    letterSpacing: -2.5,
    marginTop: 2,
  },
  welcome: {
    color: colors.text,
    fontSize: 38,
    fontWeight: '500',
    letterSpacing: -1,
  },
  field: {
    backgroundColor: '#2C2C2C',
    color: colors.text,
    fontSize: 17,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  createAccount: { color: colors.text, fontSize: 25, fontWeight: '500' },
  hint: { color: '#777', fontSize: 12, marginTop: 10 },
  error: {
    color: colors.red,
    fontSize: 13.5,
    marginTop: 10,
    lineHeight: 18,
  },
});
