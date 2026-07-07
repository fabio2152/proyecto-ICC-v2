import { useState } from 'react'
import { UserPlus, Pencil, Trash2, Stethoscope } from 'lucide-react'
import { useDoctors, useCreateDoctor, useUpdateDoctor, useDeleteDoctor, type Doctor, type DoctorInput, type DoctorUpdateInput } from '../../hooks/useDoctors'
import DoctorForm from './DoctorForm'

export default function AdminDoctors() {
  const { data: doctors, isLoading } = useDoctors()
  const createMut = useCreateDoctor()
  const updateMut = useUpdateDoctor()
  const deleteMut = useDeleteDoctor()

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Doctor | undefined>(undefined)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function openCreate() {
    setEditing(undefined)
    setShowForm(true)
  }
  function openEdit(d: Doctor) {
    setEditing(d)
    setShowForm(true)
  }

  function handleSubmit(input: DoctorInput | DoctorUpdateInput) {
    if (editing) {
      updateMut.mutate({ username: editing.username, input }, { onSuccess: () => setShowForm(false) })
    } else {
      createMut.mutate(input as DoctorInput, { onSuccess: () => setShowForm(false) })
    }
  }

  const saving = createMut.isPending || updateMut.isPending
  const error = ((createMut.error ?? updateMut.error) as any)?.response?.data?.detail

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Doctores</h1>
          <p className="text-sm text-muted-foreground">Crea, edita y elimina las cuentas de doctor</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90"
        >
          <UserPlus size={15} />
          Nuevo doctor
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : !doctors || doctors.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay doctores todavía.</p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-3">Nombre</th>
                <th className="text-left font-medium px-4 py-3">Usuario</th>
                <th className="text-right font-medium px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((d) => (
                <tr key={d.username} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Stethoscope size={14} className="text-primary" />
                      <span className="font-medium">{d.name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{d.username}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground" title="Editar">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => setConfirmDelete(d.username)} className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive" title="Eliminar">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <DoctorForm
          initial={editing}
          onClose={() => setShowForm(false)}
          onSubmit={handleSubmit}
          saving={saving}
          error={error}
        />
      )}

      {/* Confirmar eliminación */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm">
            <h2 className="font-semibold mb-2">Eliminar doctor</h2>
            <p className="text-sm text-muted-foreground mb-1">
              ¿Eliminar a <strong className="text-foreground">{confirmDelete}</strong>?
            </p>
            <p className="text-xs text-destructive mb-5">
              Se desasignará de los pacientes que tenga a cargo. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm rounded-lg bg-muted hover:bg-muted/80">Cancelar</button>
              <button
                onClick={() => deleteMut.mutate(confirmDelete, { onSuccess: () => setConfirmDelete(null) })}
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
