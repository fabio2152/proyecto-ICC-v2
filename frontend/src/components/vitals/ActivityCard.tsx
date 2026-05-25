import { Bed, Footprints, Zap } from 'lucide-react'
import type { Reading } from '../../types'

interface Props {
  reading: Reading | undefined
}

const ACTIVITY_MAP = {
  rest: { label: 'Reposo', Icon: Bed, color: 'text-blue-400' },
  walking: { label: 'Caminando', Icon: Footprints, color: 'text-green-400' },
  running: { label: 'Corriendo', Icon: Zap, color: 'text-orange-400' },
}

export default function ActivityCard({ reading }: Props) {
  const activity = reading?.activity ?? null
  const config = activity ? ACTIVITY_MAP[activity] : null

  return (
    <div className="rounded-lg bg-card border border-border p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-medium">Actividad</span>
        {config ? <config.Icon size={18} className={config.color} /> : <Bed size={18} className="text-muted-foreground" />}
      </div>
      <div className="flex items-end gap-2">
        <span className={`text-2xl font-bold ${config?.color ?? 'text-muted-foreground'}`}>
          {config?.label ?? '--'}
        </span>
      </div>
      <div className="text-xs text-muted-foreground">
        {reading?.temperature != null ? `Temp: ${reading.temperature.toFixed(1)} °C` : 'Sin datos'}
      </div>
    </div>
  )
}
