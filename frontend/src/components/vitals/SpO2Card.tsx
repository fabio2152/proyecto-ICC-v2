import { Wind } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { Reading } from '../../types'

interface Props {
  reading: Reading | undefined
}

export default function SpO2Card({ reading }: Props) {
  const spo2 = reading?.spo2 ?? null

  // El MAX30102 devuelve 0 en FC y SpO2 cuando no hay dedo/muñeca en contacto.
  // No es una saturación de 0% real: es que el sensor no está captando la señal.
  const noContact = reading != null && reading.heart_rate === 0 && reading.spo2 === 0

  const colorClass =
    spo2 === null
      ? 'text-muted-foreground'
      : spo2 >= 95
      ? 'text-foreground' // Normal en blanco, igual que la Frecuencia Cardíaca
      : spo2 >= 92
      ? 'text-yellow-400'
      : 'text-red-400'

  const label =
    spo2 === null ? '--' : spo2 >= 95 ? 'Normal' : spo2 >= 92 ? 'Límite bajo' : 'Crítico — hipoxia'

  return (
    <div className="rounded-lg bg-card border border-border p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-medium">Saturación O₂</span>
        <Wind size={18} className="text-blue-400" />
      </div>
      {noContact ? (
        <div className="flex items-end gap-2">
          <span className="text-2xl font-semibold text-muted-foreground">Sin lectura</span>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <span className={cn('text-4xl font-bold tabular-nums', colorClass)}>
            {spo2 !== null ? spo2.toFixed(1) : '--'}
          </span>
          <span className="text-muted-foreground mb-1">%</span>
        </div>
      )}
      <div className={cn('text-xs', noContact ? 'text-amber-400' : colorClass)}>
        {noContact ? 'Sensor sin contacto — coloca el dedo' : label}
      </div>
    </div>
  )
}
