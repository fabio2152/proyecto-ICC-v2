import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Eye, Wifi, WifiOff, Lock } from 'lucide-react'
import { usePatients, useCreatePatient, useUpdatePatient, useDeletePatient } from '../../hooks/usePatients'
import PatientForm from './PatientForm'
import type { PatientListItem, PatientInput } from '../../types'

function isConnected(lastSeen: string | null): boolean {
  if (!lastSeen) return false
  const utc = lastSeen.endsWith('Z') ? lastSeen : lastSeen + 'Z'
  // 30s: el ESP32 envía cada 5-10s, así que 30s sin datos = realmente sin señal.
  return Date.now() - new Date(utc).getTime() < 30000
}

export default function AdminPatients() {
  const navigate = useNavigate()
  const { data: patients, isLoading } = usePatients()
  const createMut = useCreatePatient()
  const updateMut = useUpdatePatient()
  const deleteMut = useDeletePatient()

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<PatientListItem | undefined>(undefined)
  const [confirmDelete, setConfirmDelete] = useState<PatientListItem | undefined>(undefined)

  function openCreate() {
    setEditing(undefined)
    setShowForm(true)
  }
  function openEdit(p: PatientListItem) {
    setEditing(p)
    setShowForm(true)
  }
  function handleSubmit(input: PatientInput) {
    if (editing) {
      updateMut.mutate({ id: editing.id, input }, { onSuccess: () => setShowForm(false) })
    } else {
      createMut.mutate(input, { onSuccess: () => setShowForm(false) })
    }
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Pacientes</h1>
          <p className="text-sm text-muted-foreground">Gestión de todos los pacientes monitorizados</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90"
        >
          <Plus size={15} />
          Nuevo paciente
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-3">Paciente</th>
                <th className="text-left font-medium px-4 py-3">Edad</th>
                <th className="text-left font-medium px-4 py-3">Estado</th>
                <th className="text-left font-medium px-4 py-3">Últimos vitales</th>
                <th className="text-right font-medium px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {patients?.map((p) => {
                const connected = isConnected(p.last_seen)
                return (
                  <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{p.name}</span>
                        {p.is_protected && (
                          <span title="Paciente 0 — recibe datos del ESP32, no se puede eliminar">
                            <Lock size={12} className="text-primary" />
                          </span>
                        )}
                      </div>
                      {p.diagnosis && <p className="text-xs text-muted-foreground mt-0.5">{p.diagnosis}</p>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.age ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs ${connected ? 'text-green-400' : 'text-muted-foreground'}`}>
                        {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
                        {connected ? 'Conectado' : 'Sin señal'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.last_heart_rate != null
                        ? `${Math.round(p.last_heart_rate)} BPM · ${p.last_spo2?.toFixed(0)}%`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {p.is_protected && (
                          <button
                            onClick={() => navigate(`/admin/patients/${p.id}`)}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="Ver dashboard"
                          >
                            <Eye size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(p)}
                          disabled={p.is_protected}
                          className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                          title={p.is_protected ? 'No se puede eliminar el Paciente 0' : 'Eliminar'}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <PatientForm
          initial={editing}
          onClose={() => setShowForm(false)}
          onSubmit={handleSubmit}
          saving={createMut.isPending || updateMut.isPending}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm">
            <h2 className="font-semibold mb-2">Eliminar paciente</h2>
            <p className="text-sm text-muted-foreground mb-1">
              ¿Seguro que quieres eliminar a <strong className="text-foreground">{confirmDelete.name}</strong>?
            </p>
            <p className="text-xs text-destructive mb-5">
              Se borrarán todas sus lecturas, eventos e historial. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(undefined)} className="px-4 py-2 text-sm rounded-lg bg-muted hover:bg-muted/80">
                Cancelar
              </button>
              <button
                onClick={() => deleteMut.mutate(confirmDelete.id, { onSuccess: () => setConfirmDelete(undefined) })}
                disabled={deleteMut.isPending}
                className="px-4 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground hover:opacity-90 disabled:opacity-50"
              >
                {deleteMut.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
