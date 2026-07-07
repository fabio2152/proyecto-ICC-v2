import { useState } from 'react'
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import { useStats } from '../hooks/useStats'
import { useAllEvents } from '../hooks/useEvents'
import ConditionsCatalog from '../components/history/ConditionsCatalog'
import RawDataLog from '../components/history/RawDataLog'
import { formatDate } from '../lib/utils'

const EVENT_LABELS: Record<string, string> = {
  fall: 'Caída', low_spo2: 'SpO₂ baja', tachycardia: 'Taquicardia',
  bradycardia: 'Bradicardia',
}

export default function History({ patientId }: { patientId?: number }) {
  const { data: stats } = useStats(patientId)
  const { data: events } = useAllEvents(patientId)
  const [eventsOpen, setEventsOpen] = useState(false)

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">

      {/* Stats 24h */}
      <div className="rounded-lg bg-card border border-border p-5">
        <h2 className="text-sm font-medium mb-4">Resumen últimas 24 h</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'FC promedio', value: stats?.avg_hr?.toFixed(0), unit: 'BPM' },
            { label: 'FC mínima', value: stats?.min_hr?.toFixed(0), unit: 'BPM' },
            { label: 'FC máxima', value: stats?.max_hr?.toFixed(0), unit: 'BPM' },
            { label: 'SpO₂ promedio', value: stats?.avg_spo2?.toFixed(1), unit: '%' },
            { label: 'SpO₂ mínima', value: stats?.min_spo2?.toFixed(1), unit: '%' },
            { label: 'SpO₂ máxima', value: stats?.max_spo2?.toFixed(1), unit: '%' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold tabular-nums">
                {s.value ?? '--'} <span className="text-sm font-normal text-muted-foreground">{s.unit}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Eventos detectados */}
      <div className="rounded-lg bg-card border border-border p-5">
        <button
          onClick={() => setEventsOpen((o) => !o)}
          className="flex items-center gap-2 w-full text-left"
        >
          {eventsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <AlertTriangle size={15} className="text-muted-foreground" />
          <h2 className="text-sm font-medium flex-1">Eventos detectados</h2>
          {events && events.length > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">{events.length}</span>
          )}
        </button>

        {eventsOpen && (
          <div className="mt-4">
            {!events || events.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sin eventos registrados.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {events.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg border border-border text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.severity === 'critical' ? 'bg-red-500/15 text-red-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                      {e.severity}
                    </span>
                    <span className="flex-1">{EVENT_LABELS[e.type] ?? e.type}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(e.detected_at)}</span>
                    {e.acknowledged && <span className="text-xs text-green-400">✓ Reconocido</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Catálogo de condiciones clínicas */}
      <div className="rounded-lg bg-card border border-border p-5">
        <div className="mb-4">
          <h2 className="text-sm font-medium">Condiciones clínicas</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Condiciones de salud del paciente (se editan desde el panel de administración)
          </p>
        </div>
        <ConditionsCatalog patientId={patientId} readOnly />
      </div>

      {/* Registro de datos crudos recibidos por el API */}
      <RawDataLog patientId={patientId} />
    </div>
  )
}
