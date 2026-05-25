import { Wifi, WifiOff } from 'lucide-react'

interface Props {
  lastSeen: string | undefined
  patientName: string | undefined
}

export default function ConnectionStatus({ lastSeen, patientName }: Props) {
  const connected = lastSeen !== undefined && Date.now() - new Date(lastSeen).getTime() < 15000

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
