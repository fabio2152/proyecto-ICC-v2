import { AlertTriangle, X } from 'lucide-react'
import { useActiveEvents, useAcknowledgeEvent } from '../../hooks/useEvents'
import type { Event } from '../../types'

const EVENT_LABELS: Record<string, string> = {
  fall: '🆘 SOS — Alerta de emergencia',
  low_spo2: 'SpO₂ baja',
  tachycardia: 'Taquicardia',
  bradycardia: 'Bradicardia',
  immobility: 'Inmovilidad prolongada',
}

function EventRow({ event }: { event: Event }) {
  const { mutate: acknowledge, isPending } = useAcknowledgeEvent()
  const isCritical = event.severity === 'critical'

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${isCritical ? 'bg-red-500/10 border-red-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
      <AlertTriangle size={16} className={`mt-0.5 flex-shrink-0 ${isCritical ? 'text-red-400' : 'text-yellow-400'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isCritical ? 'text-red-300' : 'text-yellow-300'}`}>
          {EVENT_LABELS[event.type] ?? event.type}
        </p>
        {event.message && <p className="text-xs text-muted-foreground mt-0.5">{event.message}</p>}
      </div>
      <button
        onClick={() => acknowledge(event.id)}
        disabled={isPending}
        className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors disabled:opacity-50"
        title="Reconocer"
      >
        <X size={14} className="text-muted-foreground" />
      </button>
    </div>
  )
}

export default function AlertBanner({ patientId }: { patientId?: number }) {
  const { data: events } = useActiveEvents(patientId)

  if (!events || events.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {events.map((e) => (
        <EventRow key={e.id} event={e} />
      ))}
    </div>
  )
}
