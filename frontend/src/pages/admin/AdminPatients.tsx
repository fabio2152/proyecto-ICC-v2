import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Eye, Wifi, WifiOff, Lock, KeyRound } from 'lucide-react'
import { usePatients, useCreatePatient, useUpdatePatient, useDeletePatient, useUpdatePatientCredentials, type PatientCredentialsInput } from '../../hooks/usePatients'
import { useDoctors, useAssignDoctor } from '../../hooks/useDoctors'
import { useAuth } from '../../auth/AuthContext'
import PatientForm from './PatientForm'
import PatientCredentialsForm from './PatientCredentialsForm'
import ChangePasswordModal from '../../components/ChangePasswordModal'
import type { PatientListItem, PatientInput } from '../../types'

function isConnected(lastSeen: string | null): boolean {
  if (!lastSeen) return false
  const utc = lastSeen.endsWith('Z') ? lastSeen : lastSeen + 'Z'
  // 30s: el ESP32 envía cada 5-10s, así que 30s sin datos = realmente sin señal.
  return Date.now() - new Date(utc).getTime() < 30000
}

export default function AdminPatients() {
  const navigate = useNavigate()
  const { isCompany, isDoctor, isPatient, patientId: myPatientId, username } = useAuth()
  const { data: allPatients, isLoading } = usePatients()
  const createMut = useCreatePatient()
  const updateMut = useUpdatePatient()
  const deleteMut = useDeletePatient()
  const { data: doctors } = useDoctors()
  const assignMut = useAssignDoctor()
  const credentialsMut = useUpdatePatientCredentials()

  // Paciente: solo su fila. Médico: solo sus pacientes asignados. Empresa: todos.
  const patients = isPatient
    ? allPatients?.filter((p) => p.id === myPatientId)
    : isDoctor
    ? allPatients?.filter((p) => p.assigned_doctor === username)
    : allPatients

  const showVitals = !isCompany  // la empresa NO ve datos clínicos del paciente
  const showDoctorCol = isCompany // solo la empresa gestiona la asignación de doctor
  const showUsernameCol = isCompany // solo la empresa edita usuario/contraseña

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<PatientListItem | undefined>(undefined)
  const [confirmDelete, setConfirmDelete] = useState<PatientListItem | undefined>(undefined)
  const [createdCreds, setCreatedCreds] = useState<{ name: string; username: string; password: string } | null>(null)
  const [editingCreds, setEditingCreds] = useState<PatientListItem | undefined>(undefined)
  const [showOwnPasswordModal, setShowOwnPasswordModal] = useState(false)

  function handleCredentialsSubmit(input: PatientCredentialsInput) {
    if (!editingCreds) return
    credentialsMut.mutate({ id: editingCreds.id, input }, { onSuccess: () => setEditingCreds(undefined) })
  }

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
      createMut.mutate(input, {
        onSuccess: (res) => {
          setShowForm(false)
          setCreatedCreds({ name: res.data.name, username: res.data.username, password: res.data.password })
        },
      })
    }
  }

  const title = isCompany ? 'Gestión de pacientes' : isPatient ? 'Mi cuenta' : 'Pacientes'
  const subtitle = isCompany
    ? 'Alta y baja de pacientes (la empresa no accede a los datos clínicos)'
    : isPatient
    ? 'Entra a tu monitoreo con el botón de ver'
    : 'Consulta y edición de todos los pacientes'

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {isCompany && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90"
          >
            <Plus size={15} />
            Nuevo paciente
          </button>
        )}
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
                {showUsernameCol && <th className="text-left font-medium px-4 py-3">Usuario</th>}
                {showDoctorCol && <th className="text-left font-medium px-4 py-3">Doctor asignado</th>}
                {showVitals && <th className="text-left font-medium px-4 py-3">Estado</th>}
                {showVitals && <th className="text-left font-medium px-4 py-3">Últimos vitales</th>}
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
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.age ?? '—'}</td>
                    {showUsernameCol && (
                      <td className="px-4 py-3 text-muted-foreground">{p.username ?? '—'}</td>
                    )}
                    {showDoctorCol && (
                      <td className="px-4 py-3">
                        <select
                          value={p.assigned_doctor ?? ''}
                          onChange={(e) =>
                            assignMut.mutate({ patientId: p.id, doctor: e.target.value || null })
                          }
                          className="bg-muted/40 border border-border rounded-lg px-2 py-1 text-xs outline-none focus:border-primary/40"
                        >
                          <option value="">Sin asignar</option>
                          {doctors?.map((d) => (
                            <option key={d.username} value={d.username}>
                              {d.name ? `${d.name} (${d.username})` : d.username}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}
                    {showVitals && (
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs ${connected ? 'text-green-400' : 'text-muted-foreground'}`}>
                          {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
                          {connected ? 'Conectado' : 'Sin señal'}
                        </span>
                      </td>
                    )}
                    {showVitals && (
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.last_heart_rate != null
                          ? `${Math.round(p.last_heart_rate)} BPM · ${p.last_spo2?.toFixed(0)}%`
                          : '—'}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Médico y paciente pueden ver el monitoreo; la empresa no. */}
                        {(isDoctor || isPatient) && (
                          <button
                            onClick={() => navigate(`/admin/patients/${p.id}`)}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="Ver monitoreo del paciente"
                          >
                            <Eye size={15} />
                          </button>
                        )}
                        {/* Solo el médico edita los detalles/condiciones. */}
                        {isDoctor && (
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="Editar"
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                        {/* La empresa edita nombre, usuario y contraseña del paciente. */}
                        {isCompany && (
                          <button
                            onClick={() => setEditingCreds(p)}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="Editar nombre, usuario y contraseña"
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                        {/* El paciente cambia solo su propia contraseña. */}
                        {isPatient && (
                          <button
                            onClick={() => setShowOwnPasswordModal(true)}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="Cambiar mi contraseña"
                          >
                            <KeyRound size={15} />
                          </button>
                        )}
                        {/* Solo la empresa da de baja pacientes. */}
                        {isCompany && (
                          <button
                            onClick={() => setConfirmDelete(p)}
                            disabled={p.is_protected}
                            className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                            title={p.is_protected ? 'No se puede eliminar el Paciente 0' : 'Eliminar'}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
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

      {editingCreds && (
        <PatientCredentialsForm
          patientName={editingCreds.name}
          initialUsername={editingCreds.username ?? ''}
          onClose={() => setEditingCreds(undefined)}
          onSubmit={handleCredentialsSubmit}
          saving={credentialsMut.isPending}
          error={(credentialsMut.error as any)?.response?.data?.detail}
        />
      )}

      {showOwnPasswordModal && (
        <ChangePasswordModal onClose={() => setShowOwnPasswordModal(false)} />
      )}

      {/* Credenciales generadas al crear un paciente (para la empresa) */}
      {createdCreds && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-2 mb-3">
              <KeyRound size={18} className="text-primary" />
              <h2 className="font-semibold">Paciente creado</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Se creó la cuenta de <strong className="text-foreground">{createdCreds.name}</strong>.
              Entrégale estas credenciales:
            </p>
            <div className="rounded-lg bg-muted/40 border border-border p-3 text-sm font-mono mb-4">
              <div>usuario: <strong>{createdCreds.username}</strong></div>
              <div>contraseña: <strong>{createdCreds.password}</strong></div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setCreatedCreds(null)}
                className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
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
