import {
  PASSWORD_MIN_LENGTH,
  hasEasyPattern,
  isPasswordStrong,
  passwordRules,
} from '../src/lib/password';

const failing = (pw: string, personal: string[] = []) =>
  passwordRules(pw, personal)
    .filter((r) => !r.ok)
    .map((r) => r.key);

describe('password policy', () => {
  it("rejects the Beta tester's example, 1234ABCD", () => {
    expect(isPasswordStrong('1234ABCD')).toBe(false);
    expect(failing('1234ABCD')).toEqual(['length', 'case', 'symbol', 'pattern']);
  });

  it('accepts a long mixed password with a symbol and no pattern', () => {
    expect(isPasswordStrong('Rhino-Lift9wave')).toBe(true);
    expect(failing('Rhino-Lift9wave')).toEqual([]);
  });

  it(`needs at least ${PASSWORD_MIN_LENGTH} characters`, () => {
    expect(failing('Rh9-wave')).toContain('length');
    expect(failing('Rh9-waveXy')).not.toContain('length');
  });

  it('needs both upper and lower case', () => {
    expect(failing('rhino-lift9wave')).toContain('case');
    expect(failing('RHINO-LIFT9WAVE')).toContain('case');
  });

  it('needs a number and a symbol from the Supabase set', () => {
    expect(failing('Rhino-Liftwave')).toContain('number');
    expect(failing('RhinoLift9wave')).toContain('symbol');
    // A space is not one of Supabase's symbols, so the server would refuse it.
    expect(failing('Rhino Lift9wave')).toContain('symbol');
  });

  it('flags runs, repeats, keyboard rows and common words', () => {
    expect(hasEasyPattern('Xy-4321-Rhino')).toBe(true); // backwards run
    expect(hasEasyPattern('Rhino-abcd-9X')).toBe(true);
    expect(hasEasyPattern('Rhino-QWER-9x')).toBe(true); // keyboard row
    expect(hasEasyPattern('Rhino-7777-Xy')).toBe(true); // repeated character
    expect(hasEasyPattern('My-P@ssw0rd-9')).toBe(true); // l33t common word
    expect(hasEasyPattern('Rhino-Lift9wave')).toBe(false);
  });

  it("flags the person's own name or email, but not short fragments", () => {
    const personal = ['Natalia', 'Li', 'nati.s@example.com'];
    expect(failing('Natalia-2026x', personal)).toContain('pattern');
    expect(failing('Go-nati.s-9X', personal)).toContain('pattern');
    // "Li" is too short to count, so "Lift" is fine.
    expect(failing('Rhino-Lift9wave', personal)).toEqual([]);
  });

  it('marks the pattern rule unmet while the field is empty', () => {
    expect(passwordRules('').find((r) => r.key === 'pattern')?.ok).toBe(false);
  });
});
