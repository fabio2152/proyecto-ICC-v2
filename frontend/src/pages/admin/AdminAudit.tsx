import { useAudit } from '../../hooks/useAudit'
import { formatTime, formatDate } from '../../lib/utils'

const ACTION_LABELS: Record<string, string> = {
  login: 'Inicio de sesión',
  login_fallido: 'Login fallido',
  crear_paciente: 'Creó paciente',
  editar_paciente: 'Editó paciente',
  eliminar_paciente: 'Eliminó paciente',
  agregar_condicion: 'Agregó condición',
  quitar_condicion: 'Quitó condición',
  config_ia: 'Configuró IA',
}

export default function AdminAudit() {
  const { data: entries, isLoading } = useAudit()

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold">Auditoría</h1>
        <p className="text-sm text-muted-foreground">Registro de acciones del sistema</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : !entries || entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin registros todavía.</p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-3 whitespace-nowrap">Fecha</th>
                <th className="text-left font-medium px-4 py-3">Usuario</th>
                <th className="text-left font-medium px-4 py-3">Acción</th>
                <th className="text-left font-medium px-4 py-3">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap text-xs">
                    {formatDate(e.created_at)} · {formatTime(e.created_at)}
                  </td>
                  <td className="px-4 py-2.5 font-medium">{e.username ?? '—'}</td>
                  <td className="px-4 py-2.5">{ACTION_LABELS[e.action] ?? e.action}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{e.detail ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
