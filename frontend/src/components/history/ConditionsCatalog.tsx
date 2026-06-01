import { Heart, Wind, Activity, AlertTriangle } from 'lucide-react'

interface Condition {
  name: string
  category: 'cardiaca' | 'respiratoria' | 'mixta'
  whyHR: string
  whySpo2: string
  alertThreshold: string
}

const CONDITIONS: Condition[] = [
  {
    name: 'Insuficiencia cardíaca congestiva',
    category: 'cardiaca',
    whyHR: 'El corazón acelera para compensar su bajo rendimiento. Taquicardias persistentes indican descompensación.',
    whySpo2: 'La congestión pulmonar impide el intercambio gaseoso, generando desaturaciones crónicas.',
    alertThreshold: 'FC > 100 BPM en reposo · SpO₂ < 94%',
  },
  {
    name: 'Fibrilación auricular (FA)',
    category: 'cardiaca',
    whyHR: 'La FA genera una FC irregularmente alta (100–180 BPM). El monitoreo continuo detecta episodios paroxísticos.',
    whySpo2: 'FC muy elevada reduce el tiempo de llenado ventricular y puede bajar la SpO₂.',
    alertThreshold: 'FC > 110 BPM sostenida · variabilidad cardíaca extrema',
  },
  {
    name: 'Taquicardia ventricular / Arritmias',
    category: 'cardiaca',
    whyHR: 'Las arritmias ventriculares generan FC peligrosamente altas (>150 BPM) con riesgo de muerte súbita.',
    whySpo2: 'El gasto cardíaco cae y compromete la perfusión pulmonar.',
    alertThreshold: 'FC > 130 BPM en reposo · SpO₂ < 92%',
  },
  {
    name: 'Síndrome coronario agudo (post-infarto)',
    category: 'cardiaca',
    whyHR: 'Durante la recuperación, la FC elevada aumenta la demanda de oxígeno del miocardio dañado.',
    whySpo2: 'El tejido cardíaco necrótico reduce la eficiencia de bomba y puede desaturar al paciente.',
    alertThreshold: 'FC > 90 BPM en reposo · SpO₂ < 95%',
  },
  {
    name: 'Bradicardia sintomática',
    category: 'cardiaca',
    whyHR: 'FC < 50 BPM en reposo puede indicar bloqueo AV o disfunción del nodo sinusal con riesgo de síncope.',
    whySpo2: 'FC muy baja reduce el gasto cardíaco y puede comprometer la oxigenación cerebral.',
    alertThreshold: 'FC < 50 BPM sostenida · SpO₂ < 93%',
  },
  {
    name: 'EPOC (Enfermedad Pulmonar Obstructiva Crónica)',
    category: 'respiratoria',
    whyHR: 'Las exacerbaciones generan taquicardia refleja. La taquicardia también puede ser signo de infección.',
    whySpo2: 'La obstrucción del flujo aéreo es la causa principal de hipoxemia. Objetivo terapéutico: SpO₂ 88–92%.',
    alertThreshold: 'SpO₂ < 88% · FC > 100 BPM durante exacerbación',
  },
  {
    name: 'Asma severa',
    category: 'respiratoria',
    whyHR: 'El broncoespasmo genera taquicardia por hipoxia e hiperactividad simpática. FC > 110 indica crisis moderada-severa.',
    whySpo2: 'La crisis asmática impide la ventilación alveolar. SpO₂ < 92% indica crisis severa que requiere intervención.',
    alertThreshold: 'SpO₂ < 92% · FC > 110 BPM durante crisis',
  },
  {
    name: 'Apnea obstructiva del sueño (AOS)',
    category: 'respiratoria',
    whyHR: 'Cada episodio de apnea activa el sistema simpático, generando taquicardia nocturna repetitiva.',
    whySpo2: 'Las apneas producen desaturaciones cíclicas nocturnas (SpO₂ cae hasta 70–80% en casos severos).',
    alertThreshold: 'SpO₂ < 90% nocturna · FC irregular durante sueño',
  },
  {
    name: 'Hipertensión pulmonar',
    category: 'respiratoria',
    whyHR: 'El ventrículo derecho trabaja contra alta presión y genera taquicardia compensatoria progresiva.',
    whySpo2: 'La vasoconstricción pulmonar reduce el intercambio gaseoso. SpO₂ crónicamente baja (89–93%).',
    alertThreshold: 'SpO₂ < 90% · FC > 100 BPM en reposo',
  },
  {
    name: 'COVID-19 / Síndrome post-COVID',
    category: 'respiratoria',
    whyHR: 'La disfunción autonómica post-COVID genera taquicardia postural (POTS) y en reposo.',
    whySpo2: 'La hipoxia silenciosa es característica del COVID-19: SpO₂ cae sin disnea aparente ("happy hypoxia").',
    alertThreshold: 'SpO₂ < 94% · FC > 100 BPM en reposo prolongado',
  },
  {
    name: 'Anemia severa',
    category: 'mixta',
    whyHR: 'La baja hemoglobina obliga al corazón a bombear más rápido para mantener el aporte de oxígeno a tejidos.',
    whySpo2: 'La SpO₂ puede parecer normal (mide saturación, no cantidad de hemoglobina), pero la FC alta es el indicador clave.',
    alertThreshold: 'FC > 100 BPM en reposo persistente',
  },
  {
    name: 'Diabetes con complicaciones cardiovasculares',
    category: 'mixta',
    whyHR: 'La neuropatía autonómica diabética altera la regulación cardíaca. La taquicardia en reposo es un signo temprano.',
    whySpo2: 'Las complicaciones micro y macrovasculares pueden comprometer la perfusión pulmonar.',
    alertThreshold: 'FC > 90 BPM en reposo · SpO₂ < 95%',
  },
  {
    name: 'Insuficiencia respiratoria crónica',
    category: 'respiratoria',
    whyHR: 'La hipoxia crónica activa el sistema simpático generando taquicardia sostenida como mecanismo compensador.',
    whySpo2: 'La SpO₂ es el parámetro de referencia para titular la oxigenoterapia domiciliaria (objetivo > 90%).',
    alertThreshold: 'SpO₂ < 90% · FC > 100 BPM',
  },
  {
    name: 'Cardiopatías congénitas (adultos)',
    category: 'cardiaca',
    whyHR: 'Las cardiopatías congénitas no corregidas generan arritmias crónicas. El monitoreo detecta descompensaciones.',
    whySpo2: 'Los shunts intracardíacos mezclan sangre oxigenada y no oxigenada, causando cianosis y SpO₂ baja.',
    alertThreshold: 'SpO₂ < 90% · FC fuera del rango basal del paciente',
  },
]

const CATEGORY_CONFIG = {
  cardiaca: { label: 'Cardíaca', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', Icon: Heart },
  respiratoria: { label: 'Respiratoria', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', Icon: Wind },
  mixta: { label: 'Mixta', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', Icon: Activity },
}

export default function ConditionsCatalog() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Condiciones clínicas en las que el monitoreo continuo de <strong className="text-foreground">frecuencia cardíaca</strong> y <strong className="text-foreground">saturación de oxígeno</strong> aporta valor diagnóstico y de seguimiento.
      </p>

      {CONDITIONS.map((c) => {
        const cat = CATEGORY_CONFIG[c.category]
        const { Icon } = cat
        return (
          <div key={c.name} className="rounded-lg bg-card border border-border p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 flex-shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${cat.bg} ${cat.color}`}>
                <Icon size={11} />
                {cat.label}
              </span>
              <p className="font-medium text-sm">{c.name}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex gap-2">
                <Heart size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-red-400 mb-0.5">Por qué monitorear FC</p>
                  <p className="text-xs text-muted-foreground">{c.whyHR}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Wind size={13} className="text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-blue-400 mb-0.5">Por qué monitorear SpO₂</p>
                  <p className="text-xs text-muted-foreground">{c.whySpo2}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-border">
              <AlertTriangle size={11} className="text-yellow-400 flex-shrink-0" />
              <p className="text-xs text-yellow-400/80"><span className="font-medium">Umbral de alerta:</span> {c.alertThreshold}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
