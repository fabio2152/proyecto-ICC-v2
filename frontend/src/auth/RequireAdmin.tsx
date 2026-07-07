import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

// Solo el doctor accede (Configuración de IA).
export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isDoctor } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  if (!isDoctor) {
    return <Navigate to="/admin" replace />
  }
  return <>{children}</>
}
