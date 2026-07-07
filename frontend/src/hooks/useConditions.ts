import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '../api/client'

export interface PatientCondition {
  id: number
  patient_id: number
  condition_id: string
  name: string
  emoji: string | null
  category: string | null
  created_at: string
}

export interface ConditionInput {
  condition_id: string
  name: string
  emoji?: string | null
  category?: string | null
}

function key(patientId?: number) {
  return ['conditions', patientId ?? 'demo']
}

function params(patientId?: number) {
  return patientId ? { patient_id: patientId } : undefined
}

export function useConditions(patientId?: number) {
  return useQuery<PatientCondition[]>({
    queryKey: key(patientId),
    queryFn: async () => {
      const { data } = await client.get<PatientCondition[]>('/api/conditions', {
        params: params(patientId),
      })
      return data
    },
  })
}

export function useAddCondition(patientId?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ConditionInput) =>
      client.post<PatientCondition>('/api/conditions', input, { params: params(patientId) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(patientId) }),
  })
}

export function useDeleteCondition(patientId?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (conditionId: string) =>
      client.delete(`/api/conditions/${conditionId}`, { params: params(patientId) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(patientId) }),
  })
}
