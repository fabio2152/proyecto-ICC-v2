import { useState } from 'react'
import { KeyRound, CheckCircle2, Loader2 } from 'lucide-react'
import { useAiStatus, useSaveAiKey } from '../../hooks/useAi'

export default function AiKeyConfig() {
  const { data: status } = useAiStatus()
  const saveKey = useSaveAiKey()
  const [key, setKey] = useState('')

  const configured = status?.configured ?? false

  function save() {
    const trimmed = key.trim()
    if (!trimmed) return
    saveKey.mutate(trimmed, { onSuccess: () => setKey('') })
  }

  return (
    <div className="rounded-lg bg-card border border-border p-5">
      <div className="flex items-center gap-2 mb-1">
        <KeyRound size={16} className="text-muted-foreground" />
        <h2 className="text-sm font-medium">Configuración de IA (Anthropic)</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Pega tu API key de Anthropic para activar el módulo de análisis con IA del dashboard.
        La clave se guarda en el servidor y no se vuelve a mostrar.
      </p>

      {configured && (
        <div className="flex items-center gap-2 text-xs text-green-400 mb-3">
          <CheckCircle2 size={14} /> IA activada
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sk-ant-api03-…"
          className="flex-1 rounded-lg bg-muted/40 border border-border px-3 py-2 text-sm outline-none focus:border-primary/40 font-mono"
        />
        <button
          onClick={save}
          disabled={saveKey.isPending || !key.trim()}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
        >
          {saveKey.isPending && <Loader2 size={14} className="animate-spin" />}
          {configured ? 'Actualizar clave' : 'Activar IA'}
        </button>
      </div>

      {saveKey.isError && (
        <p className="text-xs text-red-400 mt-2">No se pudo guardar la clave.</p>
      )}
    </div>
  )
}
