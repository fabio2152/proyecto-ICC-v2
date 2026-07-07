import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import { Shield, LogOut, Users, Settings, User } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'

export default function AdminLayout() {
  const { logout, isAdmin, name, username } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 text-sm transition-colors ${
      isActive ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
    }`

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-border bg-card px-6 py-3 flex items-center gap-6">
        <div className="flex items-center gap-2 font-semibold text-primary">
          {isAdmin ? <Shield size={20} /> : <User size={20} />}
          VitalSOS
        </div>

        <NavLink to="/admin" end className={linkClass}>
          <Users size={15} />
          {isAdmin ? 'Pacientes' : 'Mi cuenta'}
        </NavLink>

        {isAdmin && (
          <>
            <NavLink to="/admin/config" className={linkClass}>
              <Settings size={15} />
              Configuración
            </NavLink>
          </>
        )}

        <div className="ml-auto flex items-center gap-4">
          <span className="text-xs text-muted-foreground">
            {name ?? username}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </div>
      </nav>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}
