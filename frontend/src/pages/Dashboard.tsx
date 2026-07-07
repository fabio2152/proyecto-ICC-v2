import { useLatestReading } from '../hooks/useReadings'
import { usePatient } from '../hooks/usePatients'
import HeartRateCard from '../components/vitals/HeartRateCard'
import SpO2Card from '../components/vitals/SpO2Card'
import ActivityCard from '../components/vitals/ActivityCard'
import ConnectionStatus from '../components/vitals/ConnectionStatus'
import VitalsChart from '../components/charts/VitalsChart'
import AlertBanner from '../components/alerts/AlertBanner'
import AiPanel from '../components/ai/AiPanel'

export default function Dashboard({ patientId }: { patientId?: number }) {
  const { data: reading } = useLatestReading(patientId)
  const { data: patient } = usePatient(patientId)

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <ConnectionStatus lastSeen={reading?.timestamp} patientName={patient?.name} />
      </div>

      <AlertBanner patientId={patientId} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <HeartRateCard reading={reading ?? undefined} previous={reading ?? undefined} />
        <SpO2Card reading={reading ?? undefined} />
        <ActivityCard reading={reading ?? undefined} />
      </div>

      <VitalsChart patientId={patientId} />

      <AiPanel patientId={patientId} />
    </div>
  )
}
