import { useQuery } from '@tanstack/react-query'
import client from '../api/client'
import type { Reading } from '../types'

export function useLatestReading() {
  return useQuery<Reading>({
    queryKey: ['readings', 'latest'],
    queryFn: async () => {
      const { data } = await client.get<Reading>('/api/readings/latest')
      return data
    },
    refetchInterval: 3000,
  })
}

export function useReadings(windowMinutes: number) {
  return useQuery<Reading[]>({
    queryKey: ['readings', windowMinutes],
    queryFn: async () => {
      const from = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()
      const { data } = await client.get<Reading[]>('/api/readings', {
        params: { from, limit: 1000 },
      })
      return [...data].reverse()
    },
    refetchInterval: 3000,
  })
}
