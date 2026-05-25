import { useQuery } from '@tanstack/react-query'
import client from '../api/client'
import { useLatestReading } from '../hooks/useReadings'
import HeartRateCard from '../components/vitals/HeartRateCard'
import SpO2Card from '../components/vitals/SpO2Card'
import ActivityCard from '../components/vitals/ActivityCard'
import ConnectionStatus from '../components/vitals/ConnectionStatus'
import VitalsChart from '../components/charts/VitalsChart'
import AlertBanner from '../components/alerts/AlertBanner'
import type { Patient } from '../types'

export default function Dashboard() {
  const { data: reading } = useLatestReading()
  const { data: prevReading } = useLatestReading()

  const { data: patient } = useQuery<Patient>({
    queryKey: ['patient'],
    queryFn: async () => {
      const { data } = await client.get<Patient>('/api/patient')
      return data
    },
  })

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <ConnectionStatus lastSeen={reading?.timestamp} patientName={patient?.name} />
      </div>

      <AlertBanner />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <HeartRateCard reading={reading} previous={prevReading} />
        <SpO2Card reading={reading} />
        <ActivityCard reading={reading} />
      </div>

      <VitalsChart />
    </div>
  )
}
