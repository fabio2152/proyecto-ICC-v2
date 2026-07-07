import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import { Shield, LogOut, Users } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'

export default function AdminLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-border bg-card px-6 py-3 flex items-center gap-6">
        <div className="flex items-center gap-2 font-semibold text-primary">
          <Shield size={20} />
          Administración
        </div>
        <NavLink
          to="/admin"
          end
          className={({ isActive }) =>
            `flex items-center gap-1.5 text-sm transition-colors ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`
          }
        >
          <Users size={15} />
          Pacientes
        </NavLink>
        <button
          onClick={handleLogout}
          className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors"
        >
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </nav>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}
