import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../features/auth/authStore'
import { MainDashboard } from '../features/main/components/MainDashboard'

// Ports lib/pages/main/main_widget.dart (see MainDashboard for what's simplified/omitted).
// Unauthenticated visitors are redirected to /start, which leads into the real
// phone/BIN/SMS-code flow (see features/auth/*).
export function MainPage() {
  const userInfo = useAuthStore((s) => s.userInfo)

  if (!userInfo) {
    return <Navigate to="/start" replace />
  }

  return <MainDashboard />
}
