import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  if (!isAdmin) {
    return <Navigate to="/admin" replace />
  }
  return <>{children}</>
}
