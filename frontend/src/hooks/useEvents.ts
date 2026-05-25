import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '../api/client'
import type { Event } from '../types'

export function useActiveEvents() {
  return useQuery<Event[]>({
    queryKey: ['events', 'active'],
    queryFn: async () => {
      const { data } = await client.get<Event[]>('/api/events', { params: { acknowledged: false } })
      return data
    },
    refetchInterval: 3000,
  })
}

export function useAllEvents() {
  return useQuery<Event[]>({
    queryKey: ['events', 'all'],
    queryFn: async () => {
      const { data } = await client.get<Event[]>('/api/events')
      return data
    },
  })
}

export function useAcknowledgeEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => client.patch(`/api/events/${id}/acknowledge`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}
