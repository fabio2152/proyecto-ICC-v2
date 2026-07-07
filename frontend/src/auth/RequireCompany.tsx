import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

// Solo la empresa accede (gestión de doctores).
export default function RequireCompany({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isCompany } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  if (!isCompany) {
    return <Navigate to="/admin" replace />
  }
  return <>{children}</>
}
