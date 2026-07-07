import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from '../api/client'
import type { PatientListItem, PatientInput, Patient } from '../types'

export interface PatientCreated {
  id: number
  name: string
  age: number | null
  diagnosis: string | null
  username: string
  password: string
}

export function usePatients() {
  return useQuery<PatientListItem[]>({
    queryKey: ['patients'],
    queryFn: async () => {
      const { data } = await client.get<PatientListItem[]>('/api/patients')
      return data
    },
    refetchInterval: 5000,
  })
}

export function usePatient(patientId: number | undefined) {
  return useQuery<Patient>({
    queryKey: ['patient', patientId ?? 'demo'],
    queryFn: async () => {
      const url = patientId ? `/api/patients/${patientId}` : '/api/patient'
      const { data } = await client.get<Patient>(url)
      return data
    },
  })
}

export function useCreatePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: PatientInput) => client.post<PatientCreated>('/api/patients', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  })
}

export function useUpdatePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: PatientInput }) =>
      client.patch<Patient>(`/api/patients/${id}`, input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['patients'] })
      qc.invalidateQueries({ queryKey: ['patient', vars.id] })
    },
  })
}

export function useDeletePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => client.delete(`/api/patients/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  })
}

export interface PatientCredentialsInput {
  name?: string
  username?: string
  password?: string
}

export function useUpdatePatientCredentials() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: PatientCredentialsInput }) =>
      client.patch(`/api/patients/${id}/credentials`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  })
}
