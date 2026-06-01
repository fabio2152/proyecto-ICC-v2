import { useStats } from '../hooks/useStats'
import { useAllEvents } from '../hooks/useEvents'
import ConditionsCatalog from '../components/history/ConditionsCatalog'
import { formatDate } from '../lib/utils'

const EVENT_LABELS: Record<string, string> = {
  fall: 'Caída', low_spo2: 'SpO₂ baja', tachycardia: 'Taquicardia',
  bradycardia: 'Bradicardia', immobility: 'Inmovilidad',
}

export default function History() {
  const { data: stats } = useStats()
  const { data: events } = useAllEvents()

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

      {/* Catálogo de condiciones objetivo */}
      <div className="rounded-lg bg-card border border-border p-5">
        <div className="mb-4">
          <h2 className="text-sm font-medium">Condiciones clínicas</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Condiciones de salud del paciente
          </p>
        </div>
        <ConditionsCatalog />
      </div>

      {/* Eventos detectados */}
      <div className="rounded-lg bg-card border border-border p-5">
        <h2 className="text-sm font-medium mb-4">Eventos detectados</h2>
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
    </div>
  )
}
