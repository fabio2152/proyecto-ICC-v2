import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import RequireAuth from './auth/RequireAuth'
import RequireAdmin from './auth/RequireAdmin'
import AdminLogin from './pages/admin/AdminLogin'
import AdminLayout from './pages/admin/AdminLayout'
import AdminPatients from './pages/admin/AdminPatients'
import AdminPatientDetail from './pages/admin/AdminPatientDetail'
import AdminConfig from './pages/admin/AdminConfig'
import AdminAudit from './pages/admin/AdminAudit'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Login unificado (médico y pacientes) */}
          <Route path="/login" element={<AdminLogin />} />
          <Route path="/admin/login" element={<Navigate to="/login" replace />} />

          {/* Rutas antiguas → panel */}
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
          <Route path="/history" element={<Navigate to="/admin" replace />} />

          {/* Panel (todos los roles; el contenido se adapta) */}
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
            <Route path="config" element={<RequireAdmin><AdminConfig /></RequireAdmin>} />
            <Route path="audit" element={<RequireAdmin><AdminAudit /></RequireAdmin>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
