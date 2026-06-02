import { Wifi, WifiOff } from 'lucide-react'

interface Props {
  lastSeen: string | undefined
  patientName: string | undefined
}

export default function ConnectionStatus({ lastSeen, patientName }: Props) {
  // El backend devuelve timestamps UTC sin sufijo 'Z'. Sin él, JavaScript
  // los interpreta como hora local (UTC-5 en Perú), haciendo que la diferencia
  // sea siempre negativa → siempre "conectado". Añadimos 'Z' para forzar UTC.
  const lastSeenUtc = lastSeen ? (lastSeen.endsWith('Z') ? lastSeen : lastSeen + 'Z') : undefined
  const connected = lastSeenUtc !== undefined && Date.now() - new Date(lastSeenUtc).getTime() < 15000

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
