import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'

type Category = 'corazon' | 'pulmones' | 'otras'

interface Condition {
  id: string
  name: string
  emoji: string
  category: Category
}

const CATEGORY_STYLE: Record<Category, { label: string; border: string; bg: string; text: string; dot: string }> = {
  corazon:  { label: 'Corazón',  border: 'border-l-red-400',    bg: 'bg-red-400/5',    text: 'text-red-400',    dot: 'bg-red-400' },
  pulmones: { label: 'Pulmones', border: 'border-l-blue-400',   bg: 'bg-blue-400/5',   text: 'text-blue-400',   dot: 'bg-blue-400' },
  otras:    { label: 'Otras',    border: 'border-l-purple-400', bg: 'bg-purple-400/5', text: 'text-purple-400', dot: 'bg-purple-400' },
}

const ALL_CONDITIONS: Condition[] = [
  // Corazón
  { id: 'heart_failure',    name: 'Falla del corazón',                    emoji: '💔', category: 'corazon' },
  { id: 'arrhythmia',       name: 'Latidos irregulares',                  emoji: '〰️', category: 'corazon' },
  { id: 'fast_heart',       name: 'Corazón acelerado',                    emoji: '⚡', category: 'corazon' },
  { id: 'slow_heart',       name: 'Corazón muy lento',                    emoji: '🐢', category: 'corazon' },
  { id: 'post_infarct',     name: 'Recuperación de infarto',              emoji: '🏥', category: 'corazon' },
  { id: 'hypertension',     name: 'Presión arterial alta',                emoji: '📈', category: 'corazon' },
  { id: 'congenital_heart', name: 'Problema del corazón de nacimiento',   emoji: '🫀', category: 'corazon' },
  // Pulmones
  { id: 'copd',             name: 'Pulmones obstruidos (EPOC)',            emoji: '🌬️', category: 'pulmones' },
  { id: 'asthma',           name: 'Asma',                                  emoji: '💨', category: 'pulmones' },
  { id: 'sleep_apnea',      name: 'Paradas al respirar al dormir',         emoji: '😴', category: 'pulmones' },
  { id: 'pulm_hypertension',name: 'Presión alta en los pulmones',          emoji: '🫁', category: 'pulmones' },
  { id: 'post_covid',       name: 'COVID-19 / Post-COVID',                 emoji: '🦠', category: 'pulmones' },
  { id: 'resp_difficulty',  name: 'Dificultad para respirar',              emoji: '😮‍💨', category: 'pulmones' },
  { id: 'lung_cancer',      name: 'Cáncer de pulmón',                      emoji: '🩺', category: 'pulmones' },
  // Otras
  { id: 'diabetes',         name: 'Diabetes',                              emoji: '🩸', category: 'otras' },
  { id: 'anemia',           name: 'Anemia',                                emoji: '🔴', category: 'otras' },
  { id: 'obesity',          name: 'Obesidad',                              emoji: '⚖️', category: 'otras' },
  { id: 'anxiety',          name: 'Ansiedad',                              emoji: '😰', category: 'otras' },
  { id: 'panic_attacks',    name: 'Ataques de pánico',                     emoji: '😱', category: 'otras' },
  { id: 'depression',       name: 'Depresión',                             emoji: '🌧️', category: 'otras' },
  { id: 'chronic_stress',   name: 'Estrés crónico',                        emoji: '😓', category: 'otras' },
  { id: 'kidney',           name: 'Problemas de riñón',                    emoji: '🫘', category: 'otras' },
  { id: 'thyroid',          name: 'Problemas de tiroides',                 emoji: '🦋', category: 'otras' },
  { id: 'glycemia',         name: 'Bajas o subidas de azúcar',             emoji: '📊', category: 'otras' },
  { id: 'post_surgery',     name: 'Recuperación de cirugía',               emoji: '🩹', category: 'otras' },
  { id: 'elderly',          name: 'Adulto mayor en vigilancia',            emoji: '👴', category: 'otras' },
  { id: 'athlete',          name: 'Deportista en entrenamiento',           emoji: '🏃', category: 'otras' },
  { id: 'neuromuscular',    name: 'Enfermedad muscular o nerviosa',        emoji: '🧠', category: 'otras' },
  { id: 'pregnancy_risk',   name: 'Embarazo de riesgo',                    emoji: '🤰', category: 'otras' },
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

const GROUPS: { category: Category; label: string }[] = [
  { category: 'corazon', label: '❤️ Corazón' },
  { category: 'pulmones', label: '🫁 Pulmones' },
  { category: 'otras', label: '🔹 Otras condiciones' },
]

export default function ConditionsCatalog() {
  const [selected, setSelected] = useState<Condition[]>(loadSaved)
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => { save(selected) }, [selected])

  function remove(id: string) {
    setSelected(prev => prev.filter(c => c.id !== id))
  }

  function add(condition: Condition) {
    setSelected(prev => prev.find(c => c.id === condition.id) ? prev : [...prev, condition])
    setShowPicker(false)
  }

  const available = ALL_CONDITIONS.filter(c => !selected.find(s => s.id === c.id))

  return (
    <>
      <div className="flex flex-col gap-2">

        {selected.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span className="text-3xl">🩺</span>
            <p className="text-sm text-muted-foreground">
              Aún no se han añadido condiciones para este paciente.
            </p>
          </div>
        )}

        {selected.map(c => {
          const style = CATEGORY_STYLE[c.category]
          return (
            <div
              key={c.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border border-l-4 ${style.border} ${style.bg} border-border`}
            >
              <span className="text-lg leading-none">{c.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight">{c.name}</p>
                <p className={`text-xs mt-0.5 ${style.text}`}>{CATEGORY_STYLE[c.category].label}</p>
              </div>
              <button
                onClick={() => remove(c.id)}
                className="flex-shrink-0 p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                title="Eliminar"
              >
                <X size={13} />
              </button>
            </div>
          )
        })}

        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-muted/30 transition-all duration-200 mt-1"
        >
          <Plus size={15} />
          Añadir condición
        </button>
      </div>

      {/* Modal picker */}
      {showPicker && (
        <div
          className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowPicker(false) }}
        >
          <div className="bg-card border border-border rounded-t-2xl sm:rounded-xl w-full sm:max-w-sm flex flex-col max-h-[85vh] sm:max-h-[75vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
              <div>
                <h2 className="font-semibold text-base">¿Qué condición tiene el paciente?</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Toca para añadir a la lista</p>
              </div>
              <button
                onClick={() => setShowPicker(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Lista por categorías */}
            <div className="overflow-y-auto flex-1 px-3 pb-4">
              {available.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <span className="text-3xl">✅</span>
                  <p className="text-sm text-muted-foreground">Ya están todas las condiciones añadidas.</p>
                </div>
              ) : (
                GROUPS.map(group => {
                  const items = available.filter(c => c.category === group.category)
                  if (items.length === 0) return null
                  return (
                    <div key={group.category} className="mb-3">
                      <p className="text-xs font-semibold text-muted-foreground px-2 py-2 sticky top-0 bg-card">
                        {group.label}
                      </p>
                      <div className="flex flex-col gap-1">
                        {items.map(c => (
                          <button
                            key={c.id}
                            onClick={() => add(c)}
                            className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-muted/60 active:bg-muted transition-colors"
                          >
                            <span className="text-lg leading-none w-6 text-center">{c.emoji}</span>
                            <span>{c.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
