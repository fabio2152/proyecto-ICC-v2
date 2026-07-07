import { useState } from 'react'
import { X } from 'lucide-react'
import type { Doctor, DoctorInput, DoctorUpdateInput } from '../../hooks/useDoctors'

interface Props {
  initial?: Doctor
  onClose: () => void
  onSubmit: (input: DoctorInput | DoctorUpdateInput) => void
  saving: boolean
  error?: string
}

export default function DoctorForm({ initial, onClose, onSubmit, saving, error }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [username, setUsername] = useState(initial?.username ?? '')
  const [password, setPassword] = useState('')

  const isEdit = !!initial
  const valid = isEdit
    ? name.trim() && username.trim()
    : name.trim() && username.trim() && password.trim()

  function submit() {
    if (isEdit) {
      const input: DoctorUpdateInput = { name: name.trim(), username: username.trim() }
      if (password.trim()) input.password = password.trim()
      onSubmit(input)
    } else {
      onSubmit({ name: name.trim(), username: username.trim(), password: password.trim() })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">{isEdit ? 'Editar doctor' : 'Nuevo doctor'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Nombre completo *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
              placeholder="ej: Dr. Juan Pérez"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Usuario *</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
              placeholder="ej: doctor2"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Contraseña {isEdit ? '' : '*'}
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
              placeholder={isEdit ? 'Dejar en blanco para no cambiarla' : 'Contraseña del doctor'}
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
            disabled={saving || !valid}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear doctor'}
          </button>
        </div>
      </div>
    </div>
  )
}
