import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import { Activity } from 'lucide-react'

function Layout({ children }: { children: React.ReactNode }) {
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
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
