import { useState } from 'react'
import { X } from 'lucide-react'
import type { PatientCredentialsInput } from '../../hooks/usePatients'

interface Props {
  patientName: string
  initialUsername: string
  onClose: () => void
  onSubmit: (input: PatientCredentialsInput) => void
  saving: boolean
  error?: string
}

export default function PatientCredentialsForm({ patientName, initialUsername, onClose, onSubmit, saving, error }: Props) {
  const [username, setUsername] = useState(initialUsername)
  const [password, setPassword] = useState('')

  function submit() {
    const input: PatientCredentialsInput = {}
    if (username.trim() && username.trim() !== initialUsername) input.username = username.trim()
    if (password.trim()) input.password = password.trim()
    onSubmit(input)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Credenciales de {patientName}</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Usuario</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Nueva contraseña</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
              placeholder="Dejar en blanco para no cambiarla"
            />
          </div>
        </div>

        {error && <p className="text-xs text-destructive mt-2">{error}</p>}

        <div className="flex gap-2 mt-5 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-muted hover:bg-muted/80">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={saving || !username.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
