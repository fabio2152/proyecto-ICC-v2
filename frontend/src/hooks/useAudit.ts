import { useQuery } from '@tanstack/react-query'
import client from '../api/client'

export interface AuditEntry {
  id: number
  username: string | null
  action: string
  detail: string | null
  created_at: string
}

export function useAudit() {
  return useQuery<AuditEntry[]>({
    queryKey: ['audit'],
    queryFn: async () => {
      const { data } = await client.get<AuditEntry[]>('/api/audit')
      return data
    },
    refetchInterval: 5000,
  })
}
