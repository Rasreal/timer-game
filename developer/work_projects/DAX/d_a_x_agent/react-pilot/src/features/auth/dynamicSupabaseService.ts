import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { supabase as mainClient } from '../../lib/supabase'

// Ports lib/backend/dynamic_supabase_service.dart. The real app is multi-tenant:
// each company has its own Supabase project, and `company_db` (in the shared
// "bridge" database) maps a BIN (company tax ID) to that project's URL/anon
// key. This is genuinely queryable from this pilot's shared client — unlike
// products/shops/orders elsewhere in this app, company_db lives in the bridge
// DB itself. Deliberately NOT replicated: the Dart original fires a test query
// against the newly-connected company's `shops` table right after connecting;
// this port stops at creating the client and does not probe real companies'
// data as a side effect of authentication.
export const SUCCESS = 'success'
export const USER_NOT_FOUND = 'user_not_found'
export const COMPANY_NOT_FOUND = 'company_not_found'
export const INVALID_BIN = 'invalid_bin'
export const UNKNOWN_ERROR = 'unknown_error'
export type SwitchResult =
  | typeof SUCCESS
  | typeof USER_NOT_FOUND
  | typeof COMPANY_NOT_FOUND
  | typeof INVALID_BIN
  | typeof UNKNOWN_ERROR

const COMPANY_NAME_KEY = 'dynamic_supabase_company_name'
const COMPANY_URL_KEY = 'dynamic_supabase_company_url'
const COMPANY_ANON_KEY_KEY = 'dynamic_supabase_company_anon_key'

class DynamicSupabaseService {
  private static _instance: DynamicSupabaseService | null = null
  static get instance(): DynamicSupabaseService {
    return (this._instance ??= new DynamicSupabaseService())
  }

  private _currentClient: SupabaseClient | null = null
  private _currentCompanyName: string | null = null

  get mainClient() {
    return mainClient
  }

  get currentClient(): SupabaseClient {
    return this._currentClient ?? mainClient
  }

  get isUsingCompanyDatabase(): boolean {
    return this._currentClient !== null
  }

  get currentCompanyName(): string | null {
    return this._currentCompanyName
  }

  loadSavedState() {
    const companyName = localStorage.getItem(COMPANY_NAME_KEY)
    const companyUrl = localStorage.getItem(COMPANY_URL_KEY)
    const companyAnonKey = localStorage.getItem(COMPANY_ANON_KEY_KEY)

    if (companyName && companyUrl && companyAnonKey) {
      this._currentClient = createClient(companyUrl, companyAnonKey)
      this._currentCompanyName = companyName
    }
  }

  async switchToCompanyDatabase(phoneNumber: string, binNumber: string): Promise<SwitchResult> {
    const binInt = Number.parseInt(binNumber, 10)
    if (Number.isNaN(binInt)) return INVALID_BIN

    const { data: userResults, error: userError } = await mainClient
      .from('users')
      .select('*')
      .eq('phone_number', phoneNumber)
      .contains('bin', [binInt])

    if (userError) return UNKNOWN_ERROR
    if (!userResults || userResults.length === 0) return USER_NOT_FOUND

    const { data: companyResults, error: companyError } = await mainClient
      .from('company_db')
      .select('supa_url, anon_key, company_name, is_active')
      .eq('bin', binInt)
      .eq('is_active', true)

    if (companyError) return UNKNOWN_ERROR
    if (!companyResults || companyResults.length === 0) return COMPANY_NOT_FOUND

    const company = companyResults[0]
    const companyUrl = company.supa_url as string
    const companyAnonKey = company.anon_key as string
    const companyName = (company.company_name as string) ?? 'Unknown Company'

    if (this._currentCompanyName === companyName) return SUCCESS

    this._currentClient = createClient(companyUrl, companyAnonKey)
    this._currentCompanyName = companyName

    localStorage.setItem(COMPANY_NAME_KEY, companyName)
    localStorage.setItem(COMPANY_URL_KEY, companyUrl)
    localStorage.setItem(COMPANY_ANON_KEY_KEY, companyAnonKey)

    return SUCCESS
  }

  resetToMainDatabase() {
    this._currentClient = null
    this._currentCompanyName = null
    localStorage.removeItem(COMPANY_NAME_KEY)
    localStorage.removeItem(COMPANY_URL_KEY)
    localStorage.removeItem(COMPANY_ANON_KEY_KEY)
  }
}

export { DynamicSupabaseService }
