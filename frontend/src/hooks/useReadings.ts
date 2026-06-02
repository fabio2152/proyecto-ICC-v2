import { useQuery } from '@tanstack/react-query'
import client from '../api/client'
import type { Reading } from '../types'

export function useLatestReading(patientId?: number) {
  return useQuery<Reading | null>({
    queryKey: ['readings', 'latest', patientId ?? 'demo'],
    queryFn: async () => {
      try {
        const { data } = await client.get<Reading>('/api/readings/latest', {
          params: patientId ? { patient_id: patientId } : undefined,
        })
        return data
      } catch {
        return null // paciente sin lecturas (dashboard vacío)
      }
    },
    refetchInterval: 3000,
  })
}

export function useReadings(windowMinutes: number, patientId?: number) {
  return useQuery<Reading[]>({
    queryKey: ['readings', windowMinutes, patientId ?? 'demo'],
    queryFn: async () => {
      const from = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()
      const { data } = await client.get<Reading[]>('/api/readings', {
        params: { from, limit: 1000, ...(patientId ? { patient_id: patientId } : {}) },
      })
      return [...data].reverse()
    },
    refetchInterval: 3000,
  })
}
