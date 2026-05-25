import { useQuery } from '@tanstack/react-query'
import client from '../api/client'
import type { Stats } from '../types'

export function useStats() {
  return useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: async () => {
      const { data } = await client.get<Stats>('/api/stats')
      return data
    },
    refetchInterval: 30000,
  })
}
