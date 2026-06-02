import { useQuery } from '@tanstack/react-query'
import client from '../api/client'
import type { Stats } from '../types'

export function useStats(patientId?: number) {
  return useQuery<Stats>({
    queryKey: ['stats', patientId ?? 'demo'],
    queryFn: async () => {
      const { data } = await client.get<Stats>('/api/stats', {
        params: patientId ? { patient_id: patientId } : undefined,
      })
      return data
    },
    refetchInterval: 30000,
  })
}
