import { useEffect, useState } from 'react'
import { Wifi, WifiOff } from 'lucide-react'

interface Props {
  lastSeen: string | undefined
  patientName: string | undefined
}

export default function ConnectionStatus({ lastSeen, patientName }: Props) {
  // Tick propio cada 1s: fuerza re-render aunque React Query no traiga datos nuevos,
  // para que Date.now() se recalcule y el badge cambie sin necesitar recargar la página.
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // El backend devuelve timestamps UTC sin sufijo 'Z'. Sin él, JavaScript
  // los interpreta como hora local (UTC-5 en Perú) → diferencia siempre negativa.
  const lastSeenUtc = lastSeen ? (lastSeen.endsWith('Z') ? lastSeen : lastSeen + 'Z') : undefined
  // 30s: el ESP32 envía cada 5-10s, así que 30s sin datos = realmente sin señal.
  const connected = lastSeenUtc !== undefined && Date.now() - new Date(lastSeenUtc).getTime() < 30000

  return (
    <div className="flex items-center gap-3">
      <div>
        <h1 className="text-xl font-semibold">{patientName ?? 'Cargando...'}</h1>
        <p className="text-sm text-muted-foreground">Paciente monitorizado</p>
      </div>
      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${connected ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
        {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
        {connected ? 'Conectado' : 'Sin señal'}
      </div>
    </div>
  )
}
