import { useState } from 'react'
import { Sparkles, FileText, AlertTriangle, TrendingUp, Loader2 } from 'lucide-react'
import { useAiStatus, useAiAnalyze, type AiAnalysisType } from '../../hooks/useAi'

const ACTIONS: { type: AiAnalysisType; label: string; Icon: typeof FileText }[] = [
  { type: 'summary', label: 'Resumen clínico', Icon: FileText },
  { type: 'events', label: 'Explicar eventos', Icon: AlertTriangle },
  { type: 'trend', label: 'Evaluar tendencia', Icon: TrendingUp },
]

export default function AiPanel({ patientId }: { patientId?: number }) {
  const { data: status } = useAiStatus()
  const analyze = useAiAnalyze(patientId)
  const [active, setActive] = useState<AiAnalysisType | null>(null)

  const configured = status?.configured ?? false

  function run(type: AiAnalysisType) {
    setActive(type)
    analyze.mutate(type)
  }

  return (
    <div className="rounded-lg bg-card border border-border p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-primary" />
        <div className="flex-1">
          <h2 className="text-sm font-medium">Análisis con IA</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Explicación de los datos en lenguaje simple para la familia
          </p>
        </div>
      </div>

      {!configured ? (
        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2.5">
          <AlertTriangle size={14} className="flex-shrink-0" />
          Activa la IA pegando tu API key de Anthropic al final del Historial.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {ACTIONS.map(({ type, label, Icon }) => (
            <button
              key={type}
              onClick={() => run(type)}
              disabled={analyze.isPending}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-border text-sm hover:border-primary/40 hover:bg-muted/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {analyze.isPending && active === type ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Icon size={15} className="text-muted-foreground" />
              )}
              {label}
            </button>
          ))}
        </div>
      )}

      {analyze.isPending && (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Analizando los datos del paciente…
        </p>
      )}

      {analyze.isError && (
        <p className="text-sm text-red-400">
          {(analyze.error as any)?.response?.data?.detail ?? 'No se pudo generar el análisis.'}
        </p>
      )}

      {analyze.isSuccess && !analyze.isPending && (
        <div className="rounded-lg bg-muted/30 border border-border p-4 text-sm leading-relaxed whitespace-pre-wrap">
          {analyze.data}
        </div>
      )}
    </div>
  )
}
