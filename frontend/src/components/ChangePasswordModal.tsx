import { useState } from 'react'
import { X, KeyRound } from 'lucide-react'
import { useChangeOwnPassword } from '../hooks/useChangePassword'

interface Props {
  onClose: () => void
}

export default function ChangePasswordModal({ onClose }: Props) {
  const changeMut = useChangeOwnPassword()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [mismatch, setMismatch] = useState(false)
  const [done, setDone] = useState(false)

  function submit() {
    if (!next.trim() || next !== confirm) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    changeMut.mutate(
      { current_password: current, new_password: next },
      { onSuccess: () => setDone(true) }
    )
  }

  const serverError = (changeMut.error as any)?.response?.data?.detail

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <KeyRound size={16} className="text-primary" />
            Cambiar mi contraseña
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X size={16} />
          </button>
        </div>

        {done ? (
          <>
            <p className="text-sm text-green-400 mb-4">Contraseña actualizada correctamente.</p>
            <div className="flex justify-end">
              <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90">
                Cerrar
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Contraseña actual</label>
                <input
                  type="password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nueva contraseña</label>
                <input
                  type="password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Confirmar nueva contraseña</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>

            {mismatch && <p className="text-xs text-destructive mt-2">Las contraseñas nuevas no coinciden.</p>}
            {!mismatch && serverError && <p className="text-xs text-destructive mt-2">{serverError}</p>}

            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-muted hover:bg-muted/80">
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={changeMut.isPending || !current || !next || !confirm}
                className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {changeMut.isPending ? 'Guardando...' : 'Cambiar contraseña'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
