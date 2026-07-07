import { useState } from 'react'
import { UserPlus, Pencil, Trash2, Stethoscope, KeyRound, Check, X } from 'lucide-react'
import { useDoctors, useCreateDoctor, useRenameDoctor, useDeleteDoctor } from '../../hooks/useDoctors'

export default function AdminDoctors() {
  const { data: doctors, isLoading } = useDoctors()
  const createMut = useCreateDoctor()
  const renameMut = useRenameDoctor()
  const deleteMut = useDeleteDoctor()

  const [showCreate, setShowCreate] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [createdCreds, setCreatedCreds] = useState<{ username: string; password: string } | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function create() {
    const u = newUsername.trim()
    if (!u) return
    createMut.mutate(u, {
      onSuccess: (res) => {
        setShowCreate(false)
        setNewUsername('')
        setCreatedCreds({ username: res.data.username, password: res.data.password })
      },
    })
  }

  function startEdit(username: string) {
    setEditing(username)
    setEditValue(username)
  }
  function saveEdit(username: string) {
    const nv = editValue.trim()
    if (!nv || nv === username) { setEditing(null); return }
    renameMut.mutate({ username, newUsername: nv }, { onSuccess: () => setEditing(null) })
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Doctores</h1>
          <p className="text-sm text-muted-foreground">Crea, edita y elimina las cuentas de doctor</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
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
                <th className="text-left font-medium px-4 py-3">Doctor</th>
                <th className="text-right font-medium px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((d) => (
                <tr key={d.username} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Stethoscope size={14} className="text-primary" />
                      {editing === d.username ? (
                        <input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          autoFocus
                          className="bg-muted border border-border rounded-lg px-2 py-1 text-sm outline-none focus:border-primary/50"
                        />
                      ) : (
                        <span className="font-medium">{d.username}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {editing === d.username ? (
                        <>
                          <button onClick={() => saveEdit(d.username)} className="p-1.5 rounded-lg hover:bg-muted text-green-400" title="Guardar">
                            <Check size={15} />
                          </button>
                          <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground" title="Cancelar">
                            <X size={15} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(d.username)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground" title="Editar usuario">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => setConfirmDelete(d.username)} className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive" title="Eliminar">
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Crear doctor */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-2 mb-3">
              <Stethoscope size={18} className="text-primary" />
              <h2 className="font-semibold">Nuevo doctor</h2>
            </div>
            <label className="text-xs text-muted-foreground mb-1 block">Usuario del doctor</label>
            <input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="ej: doctor2"
              autoFocus
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
            />
            <p className="text-xs text-muted-foreground mt-2">La contraseña será <strong>doctor123</strong>.</p>
            {createMut.isError && (
              <p className="text-xs text-destructive mt-2">
                {(createMut.error as any)?.response?.data?.detail ?? 'No se pudo crear el doctor.'}
              </p>
            )}
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={() => { setShowCreate(false); setNewUsername('') }} className="px-4 py-2 text-sm rounded-lg bg-muted hover:bg-muted/80">Cancelar</button>
              <button onClick={create} disabled={createMut.isPending || !newUsername.trim()} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {createMut.isPending ? 'Creando...' : 'Crear doctor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credenciales del doctor creado */}
      {createdCreds && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-2 mb-3">
              <KeyRound size={18} className="text-primary" />
              <h2 className="font-semibold">Doctor creado</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-3">Entrégale estas credenciales:</p>
            <div className="rounded-lg bg-muted/40 border border-border p-3 text-sm font-mono mb-4">
              <div>usuario: <strong>{createdCreds.username}</strong></div>
              <div>contraseña: <strong>{createdCreds.password}</strong></div>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setCreatedCreds(null)} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90">Entendido</button>
            </div>
          </div>
        </div>
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
