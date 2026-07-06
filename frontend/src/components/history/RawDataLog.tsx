import { useState } from 'react'
import { ChevronDown, ChevronRight, Radio } from 'lucide-react'
import { useRecentReadings } from '../../hooks/useReadings'

const ACTIVITY_LABELS: Record<string, string> = {
  rest: 'Reposo',
  walking: 'Caminando',
  running: 'Corriendo',
}

// El backend devuelve timestamps UTC sin sufijo 'Z'. Sin él, JS los interpreta
// como hora local. Añadimos 'Z' para mostrar la hora de llegada correcta.
function formatArrival(iso: string): string {
  const utc = iso.endsWith('Z') ? iso : iso + 'Z'
  return new Date(utc).toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function num(value: number | null, decimals: number): string {
  return value === null || value === undefined ? '--' : value.toFixed(decimals)
}

export default function RawDataLog({ patientId }: { patientId?: number }) {
  const [open, setOpen] = useState(false)
  const { data: readings } = useRecentReadings(50, patientId)

  return (
    <div className="rounded-lg bg-card border border-border p-5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full text-left"
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <Radio size={15} className="text-muted-foreground" />
        <div className="flex-1">
          <h2 className="text-sm font-medium">Registro de datos recibidos (API)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Datos crudos tal como llegaron del sensor vía <code>/api/ingest</code>
          </p>
        </div>
        {readings && readings.length > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {readings.length} lecturas
          </span>
        )}
      </button>

      {open && (
        <div className="mt-4 overflow-x-auto">
          {!readings || readings.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sin datos recibidos todavía.</p>
          ) : (
            <table className="w-full text-xs tabular-nums border-collapse">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-left font-medium py-2 pr-3 whitespace-nowrap">Hora de llegada</th>
                  <th className="text-right font-medium py-2 px-2 whitespace-nowrap">FC (BPM)</th>
                  <th className="text-right font-medium py-2 px-2 whitespace-nowrap">SpO₂ (%)</th>
                  <th className="text-right font-medium py-2 px-2 whitespace-nowrap">Accel X</th>
                  <th className="text-right font-medium py-2 px-2 whitespace-nowrap">Accel Y</th>
                  <th className="text-right font-medium py-2 px-2 whitespace-nowrap">Accel Z</th>
                  <th className="text-right font-medium py-2 px-2 whitespace-nowrap">Gyro X</th>
                  <th className="text-right font-medium py-2 px-2 whitespace-nowrap">Gyro Y</th>
                  <th className="text-right font-medium py-2 px-2 whitespace-nowrap">Gyro Z</th>
                  <th className="text-right font-medium py-2 px-2 whitespace-nowrap">Temp (°C)</th>
                  <th className="text-left font-medium py-2 px-2 whitespace-nowrap">Actividad</th>
                  <th className="text-center font-medium py-2 pl-2 whitespace-nowrap">Caída</th>
                </tr>
              </thead>
              <tbody>
                {readings.map((r) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="py-1.5 pr-3 whitespace-nowrap text-muted-foreground">{formatArrival(r.timestamp)}</td>
                    <td className="py-1.5 px-2 text-right">{num(r.heart_rate, 1)}</td>
                    <td className="py-1.5 px-2 text-right">{num(r.spo2, 1)}</td>
                    <td className="py-1.5 px-2 text-right">{num(r.accel_x, 3)}</td>
                    <td className="py-1.5 px-2 text-right">{num(r.accel_y, 3)}</td>
                    <td className="py-1.5 px-2 text-right">{num(r.accel_z, 3)}</td>
                    <td className="py-1.5 px-2 text-right">{num(r.gyro_x, 3)}</td>
                    <td className="py-1.5 px-2 text-right">{num(r.gyro_y, 3)}</td>
                    <td className="py-1.5 px-2 text-right">{num(r.gyro_z, 3)}</td>
                    <td className="py-1.5 px-2 text-right">{num(r.temperature, 1)}</td>
                    <td className="py-1.5 px-2 whitespace-nowrap">{r.activity ? ACTIVITY_LABELS[r.activity] ?? r.activity : '--'}</td>
                    <td className="py-1.5 pl-2 text-center">
                      {r.fall_detected ? (
                        <span className="text-red-400 font-medium">Sí</span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
