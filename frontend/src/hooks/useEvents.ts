import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '../api/client'
import type { Event } from '../types'

export function useActiveEvents(patientId?: number) {
  return useQuery<Event[]>({
    queryKey: ['events', 'active', patientId ?? 'demo'],
    queryFn: async () => {
      const { data } = await client.get<Event[]>('/api/events', {
        params: { acknowledged: false, ...(patientId ? { patient_id: patientId } : {}) },
      })
      return data
    },
    refetchInterval: 3000,
  })
}

export function useAllEvents(patientId?: number) {
  return useQuery<Event[]>({
    queryKey: ['events', 'all', patientId ?? 'demo'],
    queryFn: async () => {
      const { data } = await client.get<Event[]>('/api/events', {
        params: patientId ? { patient_id: patientId } : undefined,
      })
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
