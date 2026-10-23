import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth';
import { isValidEmail, joinPremiumWaitlist } from '../lib/waitlist';
import { colors } from '../theme';

/** The yellow that marks Premium as "coming soon" throughout sign-up. */
export const WAITLIST_YELLOW = colors.yellow;

/** Grey pill with green type, shown under the Premium name. */
export function InDevelopmentBadge() {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>IN DEVELOPMENT</Text>
    </View>
  );
}

/**
 * "TEI Premium is in development" pop-up with the WAITLIST form.
 *
 * Render it as an overlay over whatever offered Premium. `onSent` fires after
 * the address is recorded, so the caller can close the form and return the
 * user to the tier choice.
 */
export function PremiumWaitlistForm({
  onClose,
  onSent,
}: {
  onClose: () => void;
  onSent: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [name, setName] = useState(
    profile ? `${profile.first_name} ${profile.last_name}`.trim() : '',
  );
  const [email, setEmail] = useState(profile?.email ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = isValidEmail(email) && !busy;

  async function send() {
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    setError(null);
    const result = await joinPremiumWaitlist(email, name);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onSent();
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.backdrop}
    >
      <View style={[styles.card, { paddingBottom: Math.max(insets.bottom, 20) + 8 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <Text style={styles.title}>TEI Premium</Text>
            <InDevelopmentBadge />
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close waitlist"
            hitSlop={14}
          >
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        <Text style={styles.copy}>
          TEI Premium is in development. Join the{' '}
          <Text style={{ color: WAITLIST_YELLOW, fontWeight: '700' }}>WAITLIST</Text>{' '}
          and we&rsquo;ll let you know as soon as it&rsquo;s ready. Choose
          Elemental or Basic for now; you can switch any time.
        </Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Name (optional)"
          placeholderTextColor="#8A8A8A"
          autoComplete="name"
          editable={!busy}
          selectionColor={WAITLIST_YELLOW}
          accessibilityLabel="Name"
          style={styles.field}
        />
        <TextInput
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setError(null);
          }}
          placeholder="Email"
          placeholderTextColor="#8A8A8A"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          editable={!busy}
          onSubmitEditing={() => void send()}
          selectionColor={WAITLIST_YELLOW}
          accessibilityLabel="Email"
          style={styles.field}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          onPress={canSend ? () => void send() : undefined}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Send"
          style={({ pressed }) => [
            styles.send,
            { borderColor: canSend ? WAITLIST_YELLOW : '#4A4A4A' },
            pressed && { backgroundColor: 'rgba(255,217,0,0.14)' },
          ]}
        >
          <Text style={[styles.sendText, { color: canSend ? WAITLIST_YELLOW : '#5A5A5A' }]}>
            {busy ? 'SENDING…' : 'SEND'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderColor: '#3A3A3A',
    paddingHorizontal: 22,
    paddingTop: 22,
  },
  title: { color: colors.text, fontSize: 32, fontWeight: '500', letterSpacing: -0.8 },
  close: { color: colors.orange, fontSize: 28, fontWeight: '300' },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#3A3A3A',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 2,
    marginTop: 4,
  },
  badgeText: { color: colors.green, fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  copy: { color: '#D8D8D8', fontSize: 16, lineHeight: 23, marginTop: 16, marginBottom: 14 },
  field: {
    color: colors.text,
    fontSize: 17,
    borderBottomWidth: 1,
    borderBottomColor: '#555',
    paddingVertical: 10,
    marginTop: 8,
  },
  error: { color: colors.red, fontSize: 14, lineHeight: 20, marginTop: 12 },
  send: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 12,
    marginTop: 22,
  },
  sendText: { fontSize: 18, fontWeight: '700', letterSpacing: 1, textAlign: 'center' },
});
