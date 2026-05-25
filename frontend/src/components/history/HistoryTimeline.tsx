import { FileText, Pill, AlertCircle, Stethoscope, ClipboardList } from 'lucide-react'
import { formatDate } from '../../lib/utils'
import type { MedicalHistoryEntry } from '../../types'

const TYPE_CONFIG: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  diagnosis: { label: 'Diagnóstico', Icon: Stethoscope, color: 'text-blue-400' },
  medication: { label: 'Medicación', Icon: Pill, color: 'text-green-400' },
  allergy: { label: 'Alergia', Icon: AlertCircle, color: 'text-red-400' },
  note: { label: 'Nota', Icon: FileText, color: 'text-muted-foreground' },
  procedure: { label: 'Procedimiento', Icon: ClipboardList, color: 'text-purple-400' },
}

interface Props {
  entries: MedicalHistoryEntry[]
}

export default function HistoryTimeline({ entries }: Props) {
  if (entries.length === 0) {
    return <p className="text-muted-foreground text-sm">Sin entradas en el historial.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry) => {
        const config = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.note
        const { Icon } = config
        return (
          <div key={entry.id} className="flex gap-3 p-4 rounded-lg bg-card border border-border">
            <div className={`mt-0.5 flex-shrink-0 ${config.color}`}>
              <Icon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${config.color} border-current/30 bg-current/10`}>
                  {config.label}
                </span>
                {entry.date && (
                  <span className="text-xs text-muted-foreground">{formatDate(entry.date)}</span>
                )}
              </div>
              <p className="text-sm font-medium mt-1">{entry.title}</p>
              {entry.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{entry.description}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
