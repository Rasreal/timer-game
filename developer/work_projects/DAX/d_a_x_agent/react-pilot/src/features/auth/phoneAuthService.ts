import i18n from '../../i18n'
import { supabase } from '../../lib/supabase'
import { DynamicSupabaseService } from './dynamicSupabaseService'

// Ports lib/auth/services/phone_auth_service.dart's verifyPhoneNumber. Not
// ported: device-security lockout (single-device enforcement tied to a native
// device ID concept that doesn't map cleanly to a browser) and real SMS
// sending (lib/custom_code/api_calls/sms_otp_call.dart posts to a real SMS
// gateway with real credentials — per user decision, this port generates a
// real code and returns it to the caller to display on-screen instead of
// sending it, rather than fake-send or call a real paid SMS API from a pilot).
export const DEMO_PHONE_NUMBER = '+77777777777'
export const DEMO_SMS_CODE = '111111'
export const DEMO_BIN_NUMBER = '111111111111'

export type PhoneVerificationStatus =
  | 'success'
  | 'demoUser'
  | 'userNotFound'
  | 'accessDenied'
  | 'companyNotFound'
  | 'invalidBin'
  | 'error'

export interface PhoneVerificationResult {
  status: PhoneVerificationStatus
  phoneNumber: string
  smsCode?: string
  errorMessage?: string
  /** True when the code was generated locally and must be shown to the user
   * (dev-mode stand-in for a real SMS send) rather than one already known
   * from the database (test users, demo user). */
  isDevGeneratedCode?: boolean
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '')
}

function randomSixDigitCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function verifyPhoneNumber(
  phoneNumber: string,
  binNumber?: string,
): Promise<PhoneVerificationResult> {
  const normalizedPhone = normalizePhone(phoneNumber)

  if (normalizedPhone === DEMO_PHONE_NUMBER) {
    return { status: 'demoUser', phoneNumber: normalizedPhone, smsCode: DEMO_SMS_CODE }
  }

  if (binNumber) {
    const binInt = Number.parseInt(binNumber, 10)
    if (Number.isNaN(binInt)) {
      return { status: 'error', phoneNumber: normalizedPhone, errorMessage: i18n.t('db_error_invalid_bin') }
    }
    const { data: companyResults, error } = await DynamicSupabaseService.instance.mainClient
      .from('company_db')
      .select('bin')
      .eq('bin', binInt)
      .eq('is_active', true)
    if (error) {
      return { status: 'error', phoneNumber: normalizedPhone, errorMessage: error.message }
    }
    if (!companyResults || companyResults.length === 0) {
      return { status: 'companyNotFound', phoneNumber: normalizedPhone, errorMessage: i18n.t('company_not_found') }
    }
  }

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, role_user, is_test_user, sms_code')
    .eq('phone_number', normalizedPhone)

  if (usersError) {
    return { status: 'error', phoneNumber: normalizedPhone, errorMessage: usersError.message }
  }

  const user = users?.[0]
  if (!user) {
    return {
      status: 'userNotFound',
      phoneNumber: normalizedPhone,
      errorMessage: i18n.t('auth_user_not_found_admin'),
    }
  }

  if (user.is_test_user === true) {
    if (!user.sms_code) {
      return {
        status: 'error',
        phoneNumber: normalizedPhone,
        errorMessage: i18n.t('auth_test_user_no_code'),
      }
    }
    return { status: 'success', phoneNumber: normalizedPhone, smsCode: user.sms_code as string }
  }

  if (user.role_user === 0) {
    return { status: 'accessDenied', phoneNumber: normalizedPhone, errorMessage: i18n.t('main_no_access') }
  }

  if (!user.sms_code) {
    return {
      status: 'userNotFound',
      phoneNumber: normalizedPhone,
      errorMessage: i18n.t('auth_user_not_registered'),
    }
  }

  // Real (non-test) user: generate a fresh code and surface it for on-screen
  // display instead of sending a real SMS.
  const generatedCode = randomSixDigitCode()
  return {
    status: 'success',
    phoneNumber: normalizedPhone,
    smsCode: generatedCode,
    isDevGeneratedCode: true,
  }
}

export function generateEmailFromPhone(phoneNumber: string): string {
  return `${phoneNumber}@daxagent.kz`
}
