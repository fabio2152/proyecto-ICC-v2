import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'

interface Condition {
  id: string
  name: string
}

const ALL_CONDITIONS: Condition[] = [
  { id: 'heart_failure',      name: 'Falla del corazón' },
  { id: 'arrhythmia',         name: 'Latidos irregulares' },
  { id: 'fast_heart',         name: 'Corazón acelerado' },
  { id: 'slow_heart',         name: 'Corazón muy lento' },
  { id: 'post_infarct',       name: 'Recuperación de infarto' },
  { id: 'hypertension',       name: 'Presión arterial alta' },
  { id: 'congenital_heart',   name: 'Problema del corazón de nacimiento' },
  { id: 'copd',               name: 'Pulmones obstruidos (EPOC)' },
  { id: 'asthma',             name: 'Asma' },
  { id: 'sleep_apnea',        name: 'Paradas al respirar al dormir' },
  { id: 'pulm_hypertension',  name: 'Presión alta en los pulmones' },
  { id: 'post_covid',         name: 'COVID-19 / Post-COVID' },
  { id: 'resp_difficulty',    name: 'Dificultad para respirar' },
  { id: 'anemia',             name: 'Anemia' },
  { id: 'diabetes',           name: 'Diabetes' },
  { id: 'anxiety',            name: 'Ansiedad' },
  { id: 'chronic_stress',     name: 'Estrés crónico' },
  { id: 'obesity',            name: 'Obesidad' },
  { id: 'kidney',             name: 'Problemas de riñón' },
  { id: 'thyroid',            name: 'Problemas de tiroides' },
  { id: 'post_surgery',       name: 'Recuperación de cirugía' },
  { id: 'elderly',            name: 'Adulto mayor en vigilancia' },
  { id: 'athlete',            name: 'Deportista en entrenamiento' },
  { id: 'panic_attacks',      name: 'Ataques de pánico' },
  { id: 'depression',         name: 'Depresión' },
  { id: 'hypo_hyper_glycemia',name: 'Bajas o subidas de azúcar' },
  { id: 'lung_cancer',        name: 'Cáncer de pulmón' },
  { id: 'heart_cancer',       name: 'Cáncer relacionado al corazón' },
  { id: 'neuromuscular',      name: 'Enfermedad muscular o nerviosa' },
  { id: 'pregnancy_risk',     name: 'Embarazo de riesgo' },
]

const STORAGE_KEY = 'patient_conditions'

function loadSaved(): Condition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function save(conditions: Condition[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conditions))
}

export default function ConditionsCatalog() {
  const [selected, setSelected] = useState<Condition[]>(loadSaved)
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => {
    save(selected)
  }, [selected])

  function remove(id: string) {
    setSelected(prev => prev.filter(c => c.id !== id))
  }

  function add(condition: Condition) {
    setSelected(prev => {
      if (prev.find(c => c.id === condition.id)) return prev
      return [...prev, condition]
    })
  }

  const available = ALL_CONDITIONS.filter(c => !selected.find(s => s.id === c.id))

  return (
    <>
      {/* Lista de condiciones del paciente */}
      <div className="flex flex-col gap-2">
        {selected.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">
            Aún no se han añadido condiciones para este paciente.
          </p>
        )}

        {selected.map(c => (
          <div key={c.id} className="flex items-center justify-between px-4 py-3 rounded-lg bg-muted/50 border border-border">
            <span className="text-sm font-medium">{c.name}</span>
            <button
              onClick={() => remove(c.id)}
              className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
              title="Eliminar condición"
            >
              <X size={14} />
            </button>
          </div>
        ))}

        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
        >
          <Plus size={15} />
          Añadir condición
        </button>
      </div>

      {/* Modal picker */}
      {showPicker && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-sm flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <h2 className="font-semibold text-sm">Seleccionar condición</h2>
              <button onClick={() => setShowPicker(false)} className="p-1 hover:bg-muted rounded">
                <X size={16} />
              </button>
            </div>

            {/* Lista scrollable */}
            <div className="overflow-y-auto flex-1 py-2">
              {available.length === 0 ? (
                <p className="text-sm text-muted-foreground px-5 py-3">
                  Ya están todas las condiciones añadidas.
                </p>
              ) : (
                available.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { add(c); setShowPicker(false) }}
                    className="w-full text-left px-5 py-3 text-sm hover:bg-muted/60 transition-colors border-b border-border/50 last:border-0"
                  >
                    {c.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
