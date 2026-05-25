import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import client from '../../api/client'
import type { MedicalHistoryEntry } from '../../types'

interface Props {
  onClose: () => void
}

const TYPES = ['diagnosis', 'medication', 'allergy', 'note', 'procedure'] as const

export default function HistoryEntryForm({ onClose }: Props) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ type: 'note', title: '', description: '', date: '' })

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const { data } = await client.post<MedicalHistoryEntry>('/api/history', {
        ...form,
        date: form.date || null,
        description: form.description || null,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Nueva entrada</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X size={16} />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm"
            >
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Título *</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm"
              placeholder="Título"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Descripción</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm resize-none"
              placeholder="Descripción opcional"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Fecha</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-muted hover:bg-muted/80">
            Cancelar
          </button>
          <button
            onClick={() => mutate()}
            disabled={isPending || !form.title.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
