import { Heart, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { Reading } from '../../types'

interface Props {
  reading: Reading | undefined
  previous: Reading | undefined
}

export default function HeartRateCard({ reading, previous }: Props) {
  const bpm = reading?.heart_rate ?? null
  const prevBpm = previous?.heart_rate ?? null

  // El MAX30102 devuelve 0 en FC y SpO2 cuando no hay dedo/muñeca en contacto.
  // No es una FC de 0 real: es que el sensor no está captando la señal.
  const noContact = reading != null && reading.heart_rate === 0 && reading.spo2 === 0

  let trend: 'up' | 'down' | 'stable' = 'stable'
  if (!noContact && bpm !== null && prevBpm !== null) {
    if (bpm > prevBpm + 2) trend = 'up'
    else if (bpm < prevBpm - 2) trend = 'down'
  }

  return (
    <div className="rounded-lg bg-card border border-border p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-medium">Frecuencia Cardíaca</span>
        <Heart size={18} className="text-red-400" />
      </div>
      {noContact ? (
        <div className="flex items-end gap-2">
          <span className="text-2xl font-semibold text-muted-foreground">Sin lectura</span>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <span className={cn('text-4xl font-bold tabular-nums', bpm === null && 'text-muted-foreground')}>
            {bpm !== null ? Math.round(bpm) : '--'}
          </span>
          <span className="text-muted-foreground mb-1">BPM</span>
          {trend === 'up' && <TrendingUp size={16} className="text-orange-400 mb-1" />}
          {trend === 'down' && <TrendingDown size={16} className="text-blue-400 mb-1" />}
          {trend === 'stable' && <Minus size={16} className="text-muted-foreground mb-1" />}
        </div>
      )}
      <div className={cn('text-xs', noContact ? 'text-amber-400' : 'text-muted-foreground')}>
        {noContact
          ? 'Sensor sin contacto — coloca el dedo'
          : bpm !== null && bpm > 100
          ? '⚠ Taquicardia'
          : bpm !== null && bpm < 50
          ? '⚠ Bradicardia'
          : 'Normal'}
      </div>
    </div>
  )
}
