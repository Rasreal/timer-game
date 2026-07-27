import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../../lib/supabase'
import { DynamicSupabaseService } from './dynamicSupabaseService'

// Mirrors lib/backend/schema/structs/user_info_struct.dart (UserInfoStruct),
// which the Flutter app persists to secure storage under the 'ff_userInfo' key.
//
// patronymicUser/iinUser/emailUser are additive fields (not populated by the
// phone-login path below, which has no matching backend columns to read from
// in this pilot) — they exist so ProfileSettingsItem's edit form has somewhere
// to persist local edits within this store, matching profil_widget.dart's
// UsersTable fields one-for-one.
export interface UserInfo {
  id: string | number
  userRoleId: number
  firstnameUser: string
  lastnameUser: string
  patronymicUser?: string
  iinUser?: string
  emailUser?: string
  phoneNumber: string
}

export const DEMO_USER_PHONE = '+77777777777'

interface AuthState {
  userId: string | null
  userInfo: UserInfo | null
  setSession: (userId: string, userInfo: UserInfo) => void
  updateUserInfo: (patch: Partial<UserInfo>) => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      userInfo: null,
      setSession: (userId, userInfo) => set({ userId, userInfo }),
      // Mirrors FFAppState().updateUserInfoStruct(...) in profil_widget.dart's
      // _handleSave — local-state update only. This pilot has no per-company
      // `users` table reachable from the main Supabase project to write the
      // UsersTable().update(...) side of that method to, so the edit form
      // wired to this only updates the client-side store.
      updateUserInfo: (patch) =>
        set((state) => (state.userInfo ? { userInfo: { ...state.userInfo, ...patch } } : state)),
      signOut: async () => {
        DynamicSupabaseService.instance.resetToMainDatabase()
        await supabase.auth.signOut()
        set({ userId: null, userInfo: null })
      },
    }),
    { name: 'ff_userInfo' },
  ),
)

/**
 * Loads the `users` row for the given phone number and hydrates the auth store.
 * This stands in for the app's SMS-OTP flow (lib/auth/services/phone_auth_service.dart),
 * which depends on an external SMS provider not reproducible in this pilot.
 *
 * Real (non-demo) users must call this *after* DynamicSupabaseService has
 * already switched to the per-company database (see LoginCodeEnterPage). Each
 * company project has its own `users` table with its own UUID `id` — distinct
 * from the bridge DB's integer `users.id` used only for the login/BIN gate —
 * and that per-company UUID is what `order_agent` and other per-company
 * ownership columns actually key on, so it must be the id stored as `userId`.
 */
export async function loginWithPhone(phoneNumber: string) {
  if (phoneNumber === DEMO_USER_PHONE) {
    const userInfo: UserInfo = {
      id: DEMO_USER_PHONE,
      userRoleId: 3,
      firstnameUser: 'Demo',
      lastnameUser: 'User',
      phoneNumber: DEMO_USER_PHONE,
    }
    useAuthStore.getState().setSession(DEMO_USER_PHONE, userInfo)
    return userInfo
  }

  const companyClient = DynamicSupabaseService.instance.currentClient
  const { data, error } = await companyClient
    .from('users')
    .select('id, user_role_id, firstname_user, lastname_user, phone_number')
    .eq('phone_number', phoneNumber)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('User not found for phone number')

  const userInfo: UserInfo = {
    id: data.id,
    userRoleId: data.user_role_id ?? 0,
    firstnameUser: data.firstname_user ?? '',
    lastnameUser: data.lastname_user ?? '',
    phoneNumber: data.phone_number ?? phoneNumber,
  }

  useAuthStore.getState().setSession(String(data.id), userInfo)
  return userInfo
}
