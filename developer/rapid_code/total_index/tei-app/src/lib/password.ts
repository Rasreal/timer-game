/**
 * The one password policy for every screen that sets a password (Create
 * Account, Reset Password, Profile). A Beta tester showed that the old rule
 * (8 characters, a number, a capital) let "1234ABCD" through.
 *
 * The first four rules match the Supabase Auth setting "Lowercase, uppercase
 * letters, digits and symbols" with a minimum length of 10, so the server
 * rejects anything the app would. The last rule (no easy patterns) is
 * app-only: Supabase has no equivalent on our plan.
 */

export const PASSWORD_MIN_LENGTH = 10;

/** Supabase's own symbol set for the "symbols" requirement. */
const SYMBOLS = '!@#$%^&*()_+-=[]{};\'\\:"|<>?,./`~';

/** Rows of a keyboard, so "qwer" and "asdf" count as easy patterns too. */
const RUNS = [
  '0123456789',
  'abcdefghijklmnopqrstuvwxyz',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
];

/** Words people reach for first; checked after undoing l33t swaps. */
const COMMON_WORDS = [
  'password',
  'qwerty',
  'letmein',
  'welcome',
  'admin',
  'iloveyou',
  'monkey',
  'dragon',
  'football',
  'baseball',
  'sunshine',
  'princess',
  'master',
  'secret',
  'login',
];

const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'l',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  $: 's',
  '!': 'i',
};

export type PasswordRule = { key: string; label: string; ok: boolean };

/** Four or more characters in a row, forwards or backwards (1234, dcba, qwer). */
function hasRun(lower: string): boolean {
  for (const run of RUNS) {
    const reversed = [...run].reverse().join('');
    for (let i = 0; i + 4 <= lower.length; i += 1) {
      const chunk = lower.slice(i, i + 4);
      if (run.includes(chunk) || reversed.includes(chunk)) return true;
    }
  }
  return false;
}

/**
 * True when the password leans on something easy to guess: a run like 1234
 * or abcd, one character four times (aaaa), a common word, or the person's
 * own name or email.
 */
export function hasEasyPattern(password: string, personal: string[] = []): boolean {
  const lower = password.toLowerCase();
  if (hasRun(lower)) return true;
  if (/(.)\1{3}/.test(lower)) return true;

  const unleet = [...lower].map((c) => LEET[c] ?? c).join('');
  if (COMMON_WORDS.some((w) => lower.includes(w) || unleet.includes(w))) return true;

  return personal
    .map((p) => p.trim().toLowerCase())
    // Short bits like "Al" would flag half of all passwords.
    .filter((p) => p.length >= 3)
    .some((p) => lower.includes(p));
}

/**
 * The checklist shown under a password field. `personal` is the person's
 * first name, last name and email; only the part of the email before the @
 * is used.
 */
export function passwordRules(password: string, personal: string[] = []): PasswordRule[] {
  const words = personal.map((p) => (p.includes('@') ? p.split('@')[0] : p));
  return [
    {
      key: 'length',
      label: `At least ${PASSWORD_MIN_LENGTH} characters`,
      ok: password.length >= PASSWORD_MIN_LENGTH,
    },
    {
      key: 'case',
      label: 'Upper and lower case letters',
      ok: /[A-Z]/.test(password) && /[a-z]/.test(password),
    },
    { key: 'number', label: 'At least one number', ok: /\d/.test(password) },
    {
      key: 'symbol',
      label: 'At least one symbol, like ! ? # or @',
      ok: [...password].some((c) => SYMBOLS.includes(c)),
    },
    {
      key: 'pattern',
      label: 'No easy patterns like 1234 or abcd, or your name',
      ok: password.length > 0 && !hasEasyPattern(password, words),
    },
  ];
}

export function isPasswordStrong(password: string, personal: string[] = []): boolean {
  return passwordRules(password, personal).every((r) => r.ok);
}
