import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { Activity } from 'lucide-react'
import { AuthProvider } from './auth/AuthContext'
import RequireAuth from './auth/RequireAuth'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import AdminLogin from './pages/admin/AdminLogin'
import AdminLayout from './pages/admin/AdminLayout'
import AdminPatients from './pages/admin/AdminPatients'
import AdminPatientDetail from './pages/admin/AdminPatientDetail'

function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-border bg-card px-6 py-3 flex items-center gap-6">
        <div className="flex items-center gap-2 font-semibold text-primary">
          <Activity size={20} />
          Monitor Biométrico
        </div>
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `text-sm transition-colors ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`
          }
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/history"
          className={({ isActive }) =>
            `text-sm transition-colors ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`
          }
        >
          Historial
        </NavLink>
      </nav>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Vista del paciente (kiosco) — Paciente 0 */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<PatientLayout><Dashboard /></PatientLayout>} />
          <Route path="/history" element={<PatientLayout><History /></PatientLayout>} />

          {/* Panel de administración */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route index element={<AdminPatients />} />
            <Route path="patients/:id" element={<AdminPatientDetail />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
