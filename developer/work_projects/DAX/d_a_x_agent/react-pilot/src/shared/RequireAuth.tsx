import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../features/auth/authStore'

// Guards routes that assume a signed-in user (mirrors the Dart app's
// GoRouter redirect logic gating pages behind auth state).
export function RequireAuth() {
  const userInfo = useAuthStore((s) => s.userInfo)
  if (!userInfo) return <Navigate to="/start" replace />
  return <Outlet />
}
