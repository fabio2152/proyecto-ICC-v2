import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, LayoutDashboard, FileText } from 'lucide-react'
import Dashboard from '../Dashboard'
import History from '../History'
import { usePatient } from '../../hooks/usePatients'

export default function AdminPatientDetail() {
  const { id } = useParams<{ id: string }>()
  const patientId = Number(id)
  const navigate = useNavigate()
  const { data: patient } = usePatient(patientId)
  const [tab, setTab] = useState<'dashboard' | 'history'>('dashboard')

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/admin')}
          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
          title="Volver a la lista"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg font-semibold">{patient?.name ?? 'Cargando...'}</h1>
          <p className="text-xs text-muted-foreground">Vista de administrador · Paciente #{patientId}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setTab('dashboard')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
            tab === 'dashboard'
              ? 'border-primary text-foreground font-medium'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <LayoutDashboard size={15} />
          Dashboard
        </button>
        <button
          onClick={() => setTab('history')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
            tab === 'history'
              ? 'border-primary text-foreground font-medium'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText size={15} />
          Historial
        </button>
      </div>

      {tab === 'dashboard' ? <Dashboard patientId={patientId} /> : <History patientId={patientId} />}
    </div>
  )
}
