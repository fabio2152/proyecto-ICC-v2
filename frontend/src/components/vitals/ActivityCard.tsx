import { Bed, Footprints, Zap } from 'lucide-react'
import type { Reading } from '../../types'

interface Props {
  reading: Reading | undefined
}

const ACTIVITY_MAP = {
  rest:    { label: 'Reposo',    sub: 'Normal',           Icon: Bed,       color: 'text-blue-400',   ring: 'bg-blue-400/10' },
  walking: { label: 'Caminando', sub: 'Actividad leve',   Icon: Footprints, color: 'text-foreground',  ring: 'bg-muted' },
  running: { label: 'Corriendo', sub: 'Actividad intensa', Icon: Zap,       color: 'text-orange-400', ring: 'bg-orange-400/10' },
}

export default function ActivityCard({ reading }: Props) {
  const activity = reading?.activity ?? null
  const config = activity ? ACTIVITY_MAP[activity] : null

  return (
    <div className="rounded-lg bg-card border border-border p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-medium">Actividad</span>
        <div className={`p-1.5 rounded-lg ${config?.ring ?? 'bg-muted'}`}>
          {config
            ? <config.Icon size={16} className={config.color} />
            : <Bed size={16} className="text-muted-foreground" />}
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className={`text-2xl font-bold ${config?.color ?? 'text-muted-foreground'}`}>
          {config?.label ?? '--'}
        </span>
      </div>
      <div className="text-xs text-muted-foreground">
        {config?.sub ?? 'Sin datos'}
      </div>
    </div>
  )
}
