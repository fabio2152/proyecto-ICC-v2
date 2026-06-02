import { useState } from 'react'
import { X } from 'lucide-react'
import type { PatientInput, PatientListItem } from '../../types'

interface Props {
  initial?: PatientListItem
  onClose: () => void
  onSubmit: (input: PatientInput) => void
  saving: boolean
}

export default function PatientForm({ initial, onClose, onSubmit, saving }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [age, setAge] = useState<string>(initial?.age != null ? String(initial.age) : '')
  const [diagnosis, setDiagnosis] = useState(initial?.diagnosis ?? '')

  function submit() {
    onSubmit({
      name: name.trim(),
      age: age.trim() ? Number(age) : null,
      diagnosis: diagnosis.trim() || null,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">{initial ? 'Editar paciente' : 'Nuevo paciente'}</h2>
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
              placeholder="Nombre del paciente"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Edad</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
              placeholder="Edad en años"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Diagnóstico</label>
            <textarea
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              rows={3}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary/50"
              placeholder="Diagnóstico o condición principal"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-muted hover:bg-muted/80">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={saving || !name.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : initial ? 'Guardar cambios' : 'Crear paciente'}
          </button>
        </div>
      </div>
    </div>
  )
}
